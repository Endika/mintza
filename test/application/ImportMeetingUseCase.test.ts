import { beforeEach, describe, expect, it } from 'vitest';
import {
  ImportMeetingUseCase,
  type ImportMeetingOutput,
  type ImportPreview,
  type TemplateChoice,
} from '../../src/application/use-cases/ImportMeetingUseCase';
import { GenerateMindMapUseCase } from '../../src/application/use-cases/GenerateMindMapUseCase';
import { ImportTemplatesUseCase } from '../../src/application/use-cases/ImportTemplatesUseCase';
import { RegenerateSummariesUseCase } from '../../src/application/use-cases/RegenerateSummariesUseCase';
import { Language } from '../../src/domain/language/value-objects/Language';
import { Meeting } from '../../src/domain/meeting/entities/Meeting';
import { serializeMeeting } from '../../src/domain/meeting/services/MeetingTransfer';
import { TemplateRegistry } from '../../src/domain/meeting/services/TemplateRegistry';
import { MeetingId } from '../../src/domain/meeting/value-objects/MeetingId';
import { Template, type TemplateDefinition } from '../../src/domain/meeting/value-objects/Template';
import { Summary } from '../../src/domain/summary/entities/Summary';
import { SentimentScoreParser } from '../../src/domain/temperature/services/SentimentScoreParser';
import { TokenCount } from '../../src/domain/tokens/value-objects/TokenCount';
import { TranscriptSegment } from '../../src/domain/transcription/entities/TranscriptSegment';
import { TranscriptText } from '../../src/domain/transcription/value-objects/TranscriptText';
import { AppError } from '../../src/shared/errors/AppError';
import type { Result } from '../../src/shared/result/Result';
import { LocalStorageTemplateRepository } from '../../src/infrastructure/persistence/LocalStorageTemplateRepository';
import { FakeMindMapPort } from '../fakes/FakeMindMapPort';
import { FakeSummarizationPort } from '../fakes/FakeSummarizationPort';
import { InMemoryMeetingRepository } from '../fakes/InMemoryMeetingRepository';

const memoryStorage = (): Storage => {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, v),
  };
};

const standup: TemplateDefinition = {
  id: 'standup',
  name: 'Standup',
  builtIn: false,
  systemRole: 'a daily standup',
  mindMapStructure: 'Team → Done',
  summaryKinds: ['one_liner', 'sentiment'],
  featuredOrder: ['one_liner', 'sentiment'],
  kindLabels: {},
  promptOverrides: {},
};

const NOW = new Date('2026-06-01T08:00:00Z');
const SUMMARIZER_OK = { kind: 'success', content: 'Score: 80' } as const;
const FAIL = { kind: 'failure', code: 'SUMMARIZATION_FAILED', message: 'down' } as const;

const originalMeeting = (template: Template): Meeting => {
  const meeting = Meeting.start({
    template,
    language: Language.of('en'),
    title: 'Planning',
    now: new Date('2026-05-21T10:00:00Z'),
  });
  meeting.appendSegment(
    new TranscriptSegment({
      id: 's1',
      startMs: 0,
      endMs: 5000,
      text: TranscriptText.of('hello team'),
      provider: 'whisper',
    }),
  );
  meeting.setSummary(
    new Summary({
      kind: 'one_liner',
      content: 'original',
      tokensIn: TokenCount.of(7),
      tokensOut: TokenCount.of(3),
      provider: 'openai',
      generatedAt: new Date('2026-05-21T10:01:00Z'),
    }),
  );
  meeting.finish(new Date('2026-05-21T10:00:05Z'));
  return meeting;
};

describe('ImportMeetingUseCase', () => {
  let repo: InMemoryMeetingRepository;
  let registry: TemplateRegistry;
  let summarizer: FakeSummarizationPort;
  let mindMap: FakeMindMapPort;
  let useCase: ImportMeetingUseCase;
  const freshId = MeetingId.restore('11111111-1111-4111-8111-111111111111');

  const build = (
    summaries: ConstructorParameters<typeof FakeSummarizationPort>[0] = SUMMARIZER_OK,
    map: ConstructorParameters<typeof FakeMindMapPort>[0] = { kind: 'success', rootLabel: 'Map' },
  ): void => {
    summarizer = new FakeSummarizationPort(summaries);
    mindMap = new FakeMindMapPort(map);
    useCase = new ImportMeetingUseCase(
      repo,
      registry,
      new ImportTemplatesUseCase(registry),
      new RegenerateSummariesUseCase(summarizer, repo),
      new GenerateMindMapUseCase(mindMap),
      new SentimentScoreParser(),
      () => NOW,
      () => freshId,
    );
  };

  beforeEach(() => {
    repo = new InMemoryMeetingRepository();
    registry = new TemplateRegistry(new LocalStorageTemplateRepository(memoryStorage()));
    build();
  });

  const inspect = async (meeting: Meeting): Promise<ImportPreview> => {
    const preview = await useCase.inspect(serializeMeeting(meeting));
    if (!preview.ok) throw new Error('expected a valid file');
    return preview.value;
  };

  const run = async (
    meeting: Meeting,
    choice: TemplateChoice,
  ): Promise<Result<ImportMeetingOutput, AppError>> => {
    const { parsed } = await inspect(meeting);
    return useCase.execute({ parsed, choice, titleSuffix: 'imported', copySuffix: 'copy' });
  };

  const stored = async (id: MeetingId): Promise<Meeting> => {
    const found = await repo.findById(id);
    if (!found.ok || !found.value) throw new Error('meeting not stored');
    return found.value;
  };

  it.each([
    ['a built-in template', Template.work(), true, false],
    ['a custom template this device lacks', Template.fromDefinition(standup), false, true],
  ])('inspects a file with %s', async (_name, template, available, canRecreate) => {
    const preview = await inspect(originalMeeting(template));
    expect(preview).toMatchObject({ templateAvailable: available, canRecreate });
  });

  it('fails to inspect a file that is not a meeting', async () => {
    const result = await useCase.inspect('{nope');
    expect(result.ok ? 'ok' : result.error.reason).toBe('import_not_json');
  });

  it('imports as is: keeps summaries, marks the import and calls no provider', async () => {
    const original = originalMeeting(Template.work());
    const result = await run(original, { kind: 'as-is' });

    expect(result).toMatchObject({
      ok: true,
      value: { meetingId: original.id, regenerated: false, successCount: 0, failureCount: 0 },
    });
    const meeting = await stored(original.id);
    expect(meeting.importedAt).toEqual(NOW);
    expect(meeting.title).toBe('Planning');
    expect(meeting.summaries.get('one_liner')?.content).toBe('original');
    expect(summarizer.calls).toHaveLength(0);
    expect(mindMap.calls).toHaveLength(0);
  });

  it('recreates the template from the file and keeps the summaries', async () => {
    const original = originalMeeting(Template.fromDefinition(standup));
    const result = await run(original, { kind: 'recreate' });

    expect(result.ok).toBe(true);
    const found = await registry.findById('standup');
    expect(found.ok && found.value?.name).toBe('Standup');
    const meeting = await stored(original.id);
    expect(meeting.template.id).toBe('standup');
    expect(meeting.summaries.get('one_liner')?.content).toBe('original');
    expect(summarizer.calls).toHaveLength(0);
    expect(mindMap.calls).toHaveLength(0);
  });

  it('regenerates summaries, mind map and score with a chosen local template', async () => {
    const original = originalMeeting(Template.fromDefinition(standup));
    const result = await run(original, { kind: 'use', templateId: 'generic' });

    expect(result).toMatchObject({ ok: true, value: { regenerated: true, failureCount: 0 } });
    const meeting = await stored(original.id);
    expect(meeting.template.id).toBe('generic');
    expect(meeting.importedAt).toEqual(NOW);
    expect(meeting.summaries.get('one_liner')?.content).toBe('Score: 80');
    expect(meeting.mindMap?.root.label).toBe('Map');
    expect(meeting.temperature?.value).toBe(80);
    expect(summarizer.calls.length).toBe(Template.generic().summaryKinds.length);
    expect(summarizer.calls.every((c) => c.template.id === 'generic')).toBe(true);
  });

  it('keeps the original summaries when regeneration fails', async () => {
    build(FAIL, { kind: 'failure', code: 'SUMMARIZATION_FAILED', message: 'down' });
    const original = originalMeeting(Template.fromDefinition(standup));
    const result = await run(original, { kind: 'use', templateId: 'generic' });

    expect(result).toMatchObject({
      ok: true,
      value: {
        regenerated: true,
        successCount: 0,
        failureCount: Template.generic().summaryKinds.length,
        mindMapFailed: true,
      },
    });
    const meeting = await stored(original.id);
    expect(meeting.summaries.get('one_liner')?.content).toBe('original');
    expect(meeting.mindMap).toBeUndefined();
  });

  it('imports a colliding id as a copy without touching the existing meeting', async () => {
    const original = originalMeeting(Template.work());
    await repo.save(original);
    const result = await run(original, { kind: 'as-is' });

    expect(result).toMatchObject({ ok: true, value: { meetingId: freshId } });
    expect((await stored(freshId)).title).toBe('Planning (imported)');
    const untouched = await stored(original.id);
    expect(untouched.title).toBe('Planning');
    expect(untouched.importedAt).toBeUndefined();
  });

  it('refuses to import as is when the template is missing', async () => {
    const original = originalMeeting(Template.fromDefinition(standup));
    const result = await run(original, { kind: 'as-is' });

    expect(result.ok).toBe(false);
    expect(repo.saves).toHaveLength(0);
  });

  it('refuses to recreate a template the file does not carry', async () => {
    const result = await run(originalMeeting(Template.work()), { kind: 'recreate' });
    expect(result.ok).toBe(false);
  });

  it('returns the storage error when saving fails', async () => {
    repo.failNextSave(new AppError('STORAGE_FAILED', 'disk full'));
    const result = await run(originalMeeting(Template.work()), { kind: 'as-is' });
    expect(result.ok).toBe(false);
  });
});
