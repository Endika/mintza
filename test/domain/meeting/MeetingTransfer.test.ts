import { describe, expect, it } from 'vitest';
import { Language } from '../../../src/domain/language/value-objects/Language';
import { Meeting } from '../../../src/domain/meeting/entities/Meeting';
import {
  parseMeeting,
  serializeMeeting,
  type ImportedMeeting,
} from '../../../src/domain/meeting/services/MeetingTransfer';
import {
  Template,
  type TemplateDefinition,
} from '../../../src/domain/meeting/value-objects/Template';
import { MindMap } from '../../../src/domain/mindmap/entities/MindMap';
import { MindMapNode } from '../../../src/domain/mindmap/value-objects/MindMapNode';
import { Summary } from '../../../src/domain/summary/entities/Summary';
import { TemperatureScore } from '../../../src/domain/temperature/value-objects/TemperatureScore';
import { TokenCount } from '../../../src/domain/tokens/value-objects/TokenCount';
import { TranscriptSegment } from '../../../src/domain/transcription/entities/TranscriptSegment';
import { TranscriptText } from '../../../src/domain/transcription/value-objects/TranscriptText';

const standup: TemplateDefinition = {
  id: 'standup',
  name: 'Standup',
  builtIn: false,
  systemRole: 'a daily standup',
  mindMapStructure: 'Team → Done, Doing',
  summaryKinds: ['bullet_points', 'one_liner'],
  featuredOrder: ['one_liner', 'bullet_points'],
  kindLabels: { one_liner: 'TL;DR' },
  promptOverrides: { bullet_points: 'Be brief.' },
};

const fullMeeting = (template: Template): Meeting => {
  const meeting = Meeting.start({
    template,
    language: Language.of('eu'),
    title: 'Sprint review',
    now: new Date('2026-05-21T10:00:00Z'),
  });
  meeting.appendSegment(
    new TranscriptSegment({
      id: 'seg-1',
      startMs: 0,
      endMs: 4000,
      text: TranscriptText.of('Kaixo guztioi'),
      provider: 'whisper',
      confidence: 0.9,
    }),
  );
  meeting.appendSegment(
    new TranscriptSegment({
      id: 'seg-2',
      startMs: 4000,
      endMs: 9000,
      text: TranscriptText.of('Bukatu dugu'),
      provider: 'webspeech',
    }),
  );
  for (const kind of ['one_liner', 'bullet_points'] as const) {
    meeting.setSummary(
      new Summary({
        kind,
        content: `content of ${kind}`,
        tokensIn: TokenCount.of(120),
        tokensOut: TokenCount.of(30),
        provider: 'anthropic',
        model: 'claude-x',
        generatedAt: new Date('2026-05-21T10:01:00Z'),
      }),
    );
  }
  meeting.setTemperature(TemperatureScore.of(72));
  meeting.setMindMap(
    new MindMap(new MindMapNode('Team', [new MindMapNode('Done', [])]), {
      model: 'gpt-x',
      tokensIn: TokenCount.of(50),
      tokensOut: TokenCount.of(10),
    }),
  );
  meeting.toggleStar();
  meeting.addTag('sprint');
  meeting.finish(new Date('2026-05-21T10:00:09Z'));
  return meeting;
};

const restore = (imported: ImportedMeeting, template: Template): Meeting =>
  Meeting.restore({ ...imported.state, template });

const parsed = (text: string): ImportedMeeting => {
  const result = parseMeeting(text);
  if (!result.ok) throw new Error(`expected a valid file, got ${result.error.reason}`);
  return result.value;
};

describe('meeting transfer', () => {
  it.each([
    ['a custom template', Template.fromDefinition(standup), standup],
    ['a built-in template', Template.work(), undefined],
  ])('round-trips a meeting with %s without losing anything', (_name, template, definition) => {
    const original = fullMeeting(template);
    const text = serializeMeeting(original);
    const imported = parsed(text);

    expect(imported.templateId).toBe(template.id);
    expect(imported.templateDefinition).toEqual(definition);
    expect(serializeMeeting(restore(imported, template))).toBe(text);
    const restored = restore(imported, template);
    expect(restored.mindMap?.usage?.model).toBe('gpt-x');
    expect(restored.summaries.get('one_liner')?.tokensIn.value).toBe(120);
    expect(restored.segments.map((s) => s.id)).toEqual(['seg-1', 'seg-2']);
    expect(restored.temperature?.value).toBe(72);
    expect(restored.starred).toBe(true);
    expect(restored.tags).toEqual(['sprint']);
  });

  it('writes the versioned envelope and keeps the legacy field names', () => {
    const json = JSON.parse(serializeMeeting(fullMeeting(Template.work()))) as Record<
      string,
      unknown
    >;
    expect(json).toMatchObject({
      format: 'mintza-meeting',
      version: 1,
      template: 'work',
      language: 'eu',
      durationMs: 9000,
    });
    expect(json).not.toHaveProperty('templateDefinition');
  });

  it('accepts the legacy lossy export', () => {
    const imported = parsed(
      JSON.stringify({
        id: '3f2b8c1e-5d4a-4b7e-9c10-1a2b3c4d5e6f',
        title: 'Q1 review',
        template: 'work',
        language: 'en',
        startedAt: '2026-05-21T10:00:00.000Z',
        endedAt: '2026-05-21T10:00:09.000Z',
        durationMs: 9000,
        segments: [
          { startMs: 0, endMs: 4000, text: 'Hello', provider: 'whisper', confidence: 0.8 },
          { startMs: 4000, endMs: 9000, text: 'Bye', provider: 'whisper' },
        ],
        summaries: { one_liner: { content: 'A short meeting.', provider: 'openai' } },
      }),
    );

    const meeting = restore(imported, Template.work());
    expect(meeting.segments.map((s) => s.id)).toEqual(['segment-1', 'segment-2']);
    const summary = meeting.summaries.get('one_liner');
    expect(summary?.tokensIn.value).toBe(0);
    expect(summary?.generatedAt).toEqual(new Date('2026-05-21T10:00:09Z'));
    expect(meeting.mindMap).toBeUndefined();
    expect(meeting.starred).toBe(false);
    expect(meeting.tags).toEqual([]);
    expect(imported.templateDefinition).toBeUndefined();
  });

  const valid = JSON.parse(
    serializeMeeting(fullMeeting(Template.fromDefinition(standup))),
  ) as Record<string, unknown>;
  const withField = (field: string, value: unknown): string =>
    JSON.stringify({ ...valid, [field]: value });
  const segment = (patch: object): unknown[] => [
    { ...(valid['segments'] as object[])[0], ...patch },
  ];
  const summaries = (kind: string, patch: object): object => ({
    [kind]: { ...(valid['summaries'] as Record<string, object>)['one_liner'], ...patch },
  });

  it.each([
    ['not JSON', '{nope', 'import_not_json'],
    ['a JSON array', '[]', 'import_wrong_format'],
    [
      'another Mintza format',
      JSON.stringify({ format: 'mintza-templates', version: 1 }),
      'import_wrong_format',
    ],
    ['a future version', withField('version', 2), 'import_unsupported_version'],
    ['a bad id', withField('id', 'not-a-uuid'), 'import_wrong_format'],
    ['a blank title', withField('title', '  '), 'import_wrong_format'],
    ['a blank template id', withField('template', ''), 'import_wrong_format'],
    ['an unknown language', withField('language', 'fr'), 'import_wrong_format'],
    ['a bad date', withField('startedAt', 'yesterday'), 'import_wrong_format'],
    ['non-boolean starred', withField('starred', 'yes'), 'import_wrong_format'],
    [
      'a bad template definition',
      withField('templateDefinition', { id: 'x' }),
      'import_wrong_format',
    ],
    [
      'a segment ending before it starts',
      withField('segments', segment({ endMs: -1 })),
      'import_wrong_format',
    ],
    [
      'an unknown segment provider',
      withField('segments', segment({ provider: 'x' })),
      'import_wrong_format',
    ],
    [
      'an unknown summary kind',
      withField('summaries', summaries('haiku', {})),
      'import_wrong_format',
    ],
    [
      'negative summary tokens',
      withField('summaries', summaries('one_liner', { tokensIn: -1 })),
      'import_wrong_format',
    ],
    [
      'an empty mind map label',
      withField('mindMap', { label: ' ', children: [] }),
      'import_wrong_format',
    ],
  ])('rejects %s', (_name, text, reason) => {
    const result = parseMeeting(text);
    expect(result.ok ? 'ok' : result.error.reason).toBe(reason);
  });
});
