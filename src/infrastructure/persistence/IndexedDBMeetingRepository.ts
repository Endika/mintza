import { Language } from '../../domain/language/value-objects/Language';
import { Meeting } from '../../domain/meeting/entities/Meeting';
import { MeetingId } from '../../domain/meeting/value-objects/MeetingId';
import { Template, type TemplateKind } from '../../domain/meeting/value-objects/Template';
import type {
  MeetingListItem,
  MeetingRepository,
} from '../../domain/meeting/ports/MeetingRepository';
import { MindMap } from '../../domain/mindmap/entities/MindMap';
import { MindMapNode } from '../../domain/mindmap/value-objects/MindMapNode';
import { Summary } from '../../domain/summary/entities/Summary';
import type { LLMProviderName } from '../../domain/summary/value-objects/LLMProvider';
import { isSummaryKind, type SummaryKind } from '../../domain/summary/value-objects/SummaryKind';
import { TemperatureScore } from '../../domain/temperature/value-objects/TemperatureScore';
import { Money } from '../../domain/tokens/value-objects/Money';
import { TokenCount } from '../../domain/tokens/value-objects/TokenCount';
import { TranscriptSegment } from '../../domain/transcription/entities/TranscriptSegment';
import { TranscriptText } from '../../domain/transcription/value-objects/TranscriptText';
import type { TranscriptionProviderName } from '../../domain/transcription/value-objects/TranscriptionProvider';
import { AppError } from '../../shared/errors/AppError';
import { err, ok, type Result } from '../../shared/result/Result';

const DB_NAME = 'mintza-db';
const DB_VERSION = 1;
const STORE = 'meetings';

interface PersistedSegment {
  readonly id: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly text: string;
  readonly provider: TranscriptionProviderName;
  readonly confidence?: number;
}

interface PersistedSummary {
  readonly kind: SummaryKind;
  readonly content: string;
  readonly tokensIn: number;
  readonly tokensOut: number;
  readonly provider: LLMProviderName;
  readonly generatedAt: string;
}

interface PersistedMindMapNode {
  readonly label: string;
  readonly children: PersistedMindMapNode[];
}

interface PersistedMeeting {
  readonly id: string;
  readonly title: string;
  readonly template: TemplateKind;
  readonly language: 'es' | 'en' | 'eu';
  readonly startedAt: string;
  readonly endedAt?: string;
  readonly segments: PersistedSegment[];
  readonly summaries: PersistedSummary[];
  readonly temperature?: number;
  readonly mindMap?: PersistedMindMapNode;
  readonly costMicroUsd: number;
  readonly starred: boolean;
  readonly tags: string[];
}

export class IndexedDBMeetingRepository implements MeetingRepository {
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(private readonly indexedDB: IDBFactory = globalThis.indexedDB) {}

  private getDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      const request = this.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('startedAt', 'startedAt');
          store.createIndex('template', 'template');
          store.createIndex('starred', 'starred');
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return this.dbPromise;
  }

  async save(meeting: Meeting): Promise<Result<void, AppError>> {
    try {
      const db = await this.getDb();
      const persisted = toPersisted(meeting);
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(persisted);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      return ok(undefined);
    } catch (cause) {
      return err(new AppError('STORAGE_FAILED', 'Failed to save meeting', cause));
    }
  }

  async findById(id: MeetingId): Promise<Result<Meeting | null, AppError>> {
    try {
      const db = await this.getDb();
      const persisted = await new Promise<PersistedMeeting | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const request = tx.objectStore(STORE).get(id.value);
        request.onsuccess = () => resolve(request.result as PersistedMeeting | undefined);
        request.onerror = () => reject(request.error);
      });
      if (!persisted) return ok(null);
      return ok(fromPersisted(persisted));
    } catch (cause) {
      return err(new AppError('STORAGE_FAILED', 'Failed to load meeting', cause));
    }
  }

  async list(): Promise<Result<MeetingListItem[], AppError>> {
    try {
      const db = await this.getDb();
      const records = await new Promise<PersistedMeeting[]>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const request = tx.objectStore(STORE).getAll();
        request.onsuccess = () => resolve(request.result as PersistedMeeting[]);
        request.onerror = () => reject(request.error);
      });
      const items: MeetingListItem[] = records
        .map((r) => ({
          id: MeetingId.restore(r.id),
          title: r.title,
          startedAt: new Date(r.startedAt),
          durationMs: r.endedAt
            ? new Date(r.endedAt).getTime() - new Date(r.startedAt).getTime()
            : 0,
          templateKind: r.template,
          starred: r.starred,
        }))
        .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
      return ok(items);
    } catch (cause) {
      return err(new AppError('STORAGE_FAILED', 'Failed to list meetings', cause));
    }
  }

  async delete(id: MeetingId): Promise<Result<void, AppError>> {
    try {
      const db = await this.getDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(id.value);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      return ok(undefined);
    } catch (cause) {
      return err(new AppError('STORAGE_FAILED', 'Failed to delete meeting', cause));
    }
  }

  async clearAll(): Promise<Result<void, AppError>> {
    try {
      const db = await this.getDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      return ok(undefined);
    } catch (cause) {
      return err(new AppError('STORAGE_FAILED', 'Failed to clear meetings', cause));
    }
  }
}

const toPersisted = (meeting: Meeting): PersistedMeeting => ({
  id: meeting.id.value,
  title: meeting.title,
  template: meeting.template.kind,
  language: meeting.language.code,
  startedAt: meeting.startedAt.toISOString(),
  ...(meeting.endedAt ? { endedAt: meeting.endedAt.toISOString() } : {}),
  segments: meeting.segments.map((s) => ({
    id: s.id,
    startMs: s.startMs,
    endMs: s.endMs,
    text: s.text.value,
    provider: s.provider,
    ...(s.confidence !== undefined ? { confidence: s.confidence } : {}),
  })),
  summaries: Array.from(meeting.summaries.values()).map((s) => ({
    kind: s.kind,
    content: s.content,
    tokensIn: s.tokensIn.value,
    tokensOut: s.tokensOut.value,
    provider: s.provider,
    generatedAt: s.generatedAt.toISOString(),
  })),
  ...(meeting.temperature !== undefined ? { temperature: meeting.temperature.value } : {}),
  ...(meeting.mindMap ? { mindMap: nodeToPersisted(meeting.mindMap.root) } : {}),
  costMicroUsd: meeting.cost.microUsd,
  starred: meeting.starred,
  tags: [...meeting.tags],
});

const nodeToPersisted = (node: MindMapNode): PersistedMindMapNode => ({
  label: node.label,
  children: node.children.map(nodeToPersisted),
});

const nodeFromPersisted = (node: PersistedMindMapNode): MindMapNode =>
  new MindMapNode(node.label, node.children.map(nodeFromPersisted));

const fromPersisted = (p: PersistedMeeting): Meeting => {
  const summaries = new Map<SummaryKind, Summary>();
  for (const s of p.summaries) {
    if (!isSummaryKind(s.kind)) continue;
    summaries.set(
      s.kind,
      new Summary({
        kind: s.kind,
        content: s.content,
        tokensIn: TokenCount.of(s.tokensIn),
        tokensOut: TokenCount.of(s.tokensOut),
        provider: s.provider,
        generatedAt: new Date(s.generatedAt),
      }),
    );
  }
  return Meeting.restore({
    id: MeetingId.restore(p.id),
    title: p.title,
    template: Template.of(p.template),
    language: Language.of(p.language),
    startedAt: new Date(p.startedAt),
    ...(p.endedAt ? { endedAt: new Date(p.endedAt) } : {}),
    segments: p.segments.map(
      (s) =>
        new TranscriptSegment({
          id: s.id,
          startMs: s.startMs,
          endMs: s.endMs,
          text: TranscriptText.of(s.text),
          provider: s.provider,
          ...(s.confidence !== undefined ? { confidence: s.confidence } : {}),
        }),
    ),
    summaries,
    ...(p.temperature !== undefined ? { temperature: TemperatureScore.of(p.temperature) } : {}),
    ...(p.mindMap ? { mindMap: new MindMap(nodeFromPersisted(p.mindMap)) } : {}),
    cost: Money.fromUsd(p.costMicroUsd / 1_000_000),
    starred: p.starred,
    tags: [...p.tags],
    totalPausedMs: 0,
  });
};
