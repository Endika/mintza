import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { Language } from '../../../src/domain/language/value-objects/Language';
import { Meeting } from '../../../src/domain/meeting/entities/Meeting';
import { TemplateRegistry } from '../../../src/domain/meeting/services/TemplateRegistry';
import { Template } from '../../../src/domain/meeting/value-objects/Template';
import { MindMap } from '../../../src/domain/mindmap/entities/MindMap';
import { MindMapNode } from '../../../src/domain/mindmap/value-objects/MindMapNode';
import { Summary } from '../../../src/domain/summary/entities/Summary';
import { TemperatureScore } from '../../../src/domain/temperature/value-objects/TemperatureScore';
import { TokenCount } from '../../../src/domain/tokens/value-objects/TokenCount';
import { TranscriptSegment } from '../../../src/domain/transcription/entities/TranscriptSegment';
import { TranscriptText } from '../../../src/domain/transcription/value-objects/TranscriptText';
import { IndexedDBMeetingRepository } from '../../../src/infrastructure/persistence/IndexedDBMeetingRepository';

describe('IndexedDBMeetingRepository', () => {
  let repo: IndexedDBMeetingRepository;

  beforeEach(() => {
    repo = new IndexedDBMeetingRepository(new IDBFactory());
  });

  afterEach(() => {
    // fake-indexeddb does not need explicit teardown when a fresh factory is used per test.
  });

  it('round-trips a meeting with summaries, temperature and mind map', async () => {
    const meeting = Meeting.start({
      template: Template.work(),
      language: Language.of('en'),
      now: new Date('2026-05-21T10:00:00Z'),
    });
    meeting.appendSegment(
      new TranscriptSegment({
        id: 's1',
        startMs: 0,
        endMs: 30_000,
        text: TranscriptText.of('hello team'),
        provider: 'whisper',
      }),
    );
    meeting.setSummary(
      new Summary({
        kind: 'bullet_points',
        content: '- one\n- two',
        tokensIn: TokenCount.of(10),
        tokensOut: TokenCount.of(5),
        provider: 'openai',
        generatedAt: new Date('2026-05-21T10:05:00Z'),
      }),
    );
    meeting.setTemperature(TemperatureScore.of(0.42));
    meeting.setMindMap(
      new MindMap(
        new MindMapNode('root', [new MindMapNode('a', []), new MindMapNode('b', [])]),
      ),
    );
    meeting.finish(new Date('2026-05-21T10:30:00Z'));

    const saved = await repo.save(meeting);
    expect(saved.ok).toBe(true);

    const loaded = await repo.findById(meeting.id);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok || !loaded.value) throw new Error('expected meeting');

    const restored = loaded.value;
    expect(restored.summaries.size).toBe(1);
    expect(restored.temperature?.value).toBeCloseTo(0.42);
    expect(restored.mindMap?.root.label).toBe('root');
    expect(restored.mindMap?.root.children.map((c) => c.label)).toEqual(['a', 'b']);
  });

  it('round-trips a meeting saved with a custom template', async () => {
    const customDef = {
      id: 'standup',
      name: 'Daily Standup',
      builtIn: false,
      systemRole: 'a daily standup',
      mindMapStructure: 'Yesterday → Today → Blockers',
      summaryKinds: ['bullet_points', 'action_items'] as const,
      featuredOrder: ['action_items', 'bullet_points'] as const,
      kindLabels: {},
      promptOverrides: {},
    };
    const templates: typeof customDef[] = [customDef];
    const templateRepo = {
      load: async () => ({ ok: true as const, value: templates }),
      save: async () => ({ ok: true as const, value: undefined }),
      delete: async () => ({ ok: true as const, value: undefined }),
    };
    const registry = new TemplateRegistry(templateRepo);
    repo = new IndexedDBMeetingRepository(new IDBFactory(), (id) =>
      registry.resolveOrFallback(id),
    );

    const meeting = Meeting.start({
      template: Template.fromDefinition(customDef),
      language: Language.of('en'),
      now: new Date('2026-05-21T12:00:00Z'),
    });

    const saved = await repo.save(meeting);
    expect(saved.ok).toBe(true);

    const loaded = await repo.findById(meeting.id);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok || !loaded.value) throw new Error('expected meeting');
    expect(loaded.value.template.id).toBe('standup');
    expect(loaded.value.template.name).toBe('Daily Standup');
  });

  it('falls back to generic when the saved template no longer exists', async () => {
    const templateRepo = {
      load: async () => ({ ok: true as const, value: [] }),
      save: async () => ({ ok: true as const, value: undefined }),
      delete: async () => ({ ok: true as const, value: undefined }),
    };
    const registry = new TemplateRegistry(templateRepo);
    repo = new IndexedDBMeetingRepository(new IDBFactory(), (id) =>
      registry.resolveOrFallback(id),
    );

    const orphanDef = {
      id: 'deleted-template',
      name: 'Gone',
      builtIn: false,
      systemRole: 'x',
      mindMapStructure: 'x',
      summaryKinds: ['bullet_points'] as const,
      featuredOrder: ['bullet_points'] as const,
      kindLabels: {},
      promptOverrides: {},
    };
    const meeting = Meeting.start({
      template: Template.fromDefinition(orphanDef),
      language: Language.of('en'),
      now: new Date('2026-05-21T13:00:00Z'),
    });

    await repo.save(meeting);
    const loaded = await repo.findById(meeting.id);
    if (!loaded.ok || !loaded.value) throw new Error('expected meeting');
    expect(loaded.value.template.id).toBe('generic');
  });

  it('round-trips a meeting without a mind map', async () => {
    const meeting = Meeting.start({
      template: Template.generic(),
      language: Language.of('es'),
      now: new Date('2026-05-21T11:00:00Z'),
    });
    meeting.appendSegment(
      new TranscriptSegment({
        id: 's1',
        startMs: 0,
        endMs: 10_000,
        text: TranscriptText.of('hola'),
        provider: 'whisper',
      }),
    );

    const saved = await repo.save(meeting);
    expect(saved.ok).toBe(true);

    const loaded = await repo.findById(meeting.id);
    if (!loaded.ok || !loaded.value) throw new Error('expected meeting');
    expect(loaded.value.mindMap).toBeUndefined();
  });
});
