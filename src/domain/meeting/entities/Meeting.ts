import type { Language } from '../../language/value-objects/Language';
import type { MindMap } from '../../mindmap/entities/MindMap';
import type { Summary } from '../../summary/entities/Summary';
import type { SummaryKind } from '../../summary/value-objects/SummaryKind';
import type { TemperatureScore } from '../../temperature/value-objects/TemperatureScore';
import { Money } from '../../tokens/value-objects/Money';
import type { TranscriptSegment } from '../../transcription/entities/TranscriptSegment';
import { TranscriptText } from '../../transcription/value-objects/TranscriptText';
import { MeetingId } from '../value-objects/MeetingId';
import type { Template } from '../value-objects/Template';

export interface MeetingState {
  readonly id: MeetingId;
  title: string;
  readonly template: Template;
  readonly language: Language;
  readonly startedAt: Date;
  endedAt?: Date;
  readonly segments: TranscriptSegment[];
  readonly summaries: Map<SummaryKind, Summary>;
  temperature?: TemperatureScore;
  mindMap?: MindMap;
  cost: Money;
  starred: boolean;
  readonly tags: string[];
  pausedAt?: Date;
  totalPausedMs: number;
}

export class Meeting {
  private constructor(private readonly state: MeetingState) {}

  static start(params: {
    template: Template;
    language: Language;
    title?: string;
    now?: Date;
  }): Meeting {
    const startedAt = params.now ?? new Date();
    return new Meeting({
      id: MeetingId.generate(),
      title: params.title ?? `Meeting ${startedAt.toISOString().slice(0, 16).replace('T', ' ')}`,
      template: params.template,
      language: params.language,
      startedAt,
      segments: [],
      summaries: new Map(),
      cost: Money.zero(),
      starred: false,
      tags: [],
      totalPausedMs: 0,
    });
  }

  static restore(state: MeetingState): Meeting {
    return new Meeting(state);
  }

  withTemplate(template: Template): Meeting {
    return new Meeting({ ...this.state, template, summaries: new Map(this.state.summaries) });
  }

  get id(): MeetingId {
    return this.state.id;
  }

  get title(): string {
    return this.state.title;
  }

  get template(): Template {
    return this.state.template;
  }

  get language(): Language {
    return this.state.language;
  }

  get startedAt(): Date {
    return this.state.startedAt;
  }

  get endedAt(): Date | undefined {
    return this.state.endedAt;
  }

  get segments(): readonly TranscriptSegment[] {
    return this.state.segments;
  }

  get summaries(): ReadonlyMap<SummaryKind, Summary> {
    return this.state.summaries;
  }

  get temperature(): TemperatureScore | undefined {
    return this.state.temperature;
  }

  get mindMap(): MindMap | undefined {
    return this.state.mindMap;
  }

  get cost(): Money {
    return this.state.cost;
  }

  get starred(): boolean {
    return this.state.starred;
  }

  get tags(): readonly string[] {
    return this.state.tags;
  }

  get isFinished(): boolean {
    return this.state.endedAt !== undefined;
  }

  get isPaused(): boolean {
    return this.state.pausedAt !== undefined && !this.isFinished;
  }

  get durationMs(): number {
    const end = this.state.endedAt ?? new Date();
    const elapsed = end.getTime() - this.state.startedAt.getTime();
    const pendingPaused = this.state.pausedAt
      ? Math.max(0, end.getTime() - this.state.pausedAt.getTime())
      : 0;
    return Math.max(0, elapsed - this.state.totalPausedMs - pendingPaused);
  }

  rename(title: string): void {
    const trimmed = title.trim();
    if (trimmed.length === 0) {
      throw new Error('Meeting title cannot be empty');
    }
    this.state.title = trimmed;
  }

  appendSegment(segment: TranscriptSegment): void {
    if (this.isFinished) {
      throw new Error('Cannot append segments to a finished meeting');
    }
    this.state.segments.push(segment);
  }

  finish(at: Date = new Date()): void {
    if (this.isFinished) return;
    if (at.getTime() < this.state.startedAt.getTime()) {
      throw new Error('Meeting cannot end before it started');
    }
    if (this.state.pausedAt) {
      this.state.totalPausedMs += Math.max(0, at.getTime() - this.state.pausedAt.getTime());
      delete this.state.pausedAt;
    }
    this.state.endedAt = at;
  }

  pause(at: Date = new Date()): void {
    if (this.isFinished || this.state.pausedAt) return;
    this.state.pausedAt = at;
  }

  resume(at: Date = new Date()): void {
    if (this.isFinished || !this.state.pausedAt) return;
    this.state.totalPausedMs += Math.max(0, at.getTime() - this.state.pausedAt.getTime());
    delete this.state.pausedAt;
  }

  setSummary(summary: Summary): void {
    this.state.summaries.set(summary.kind, summary);
  }

  setTemperature(score: TemperatureScore): void {
    this.state.temperature = score;
  }

  setMindMap(mindMap: MindMap): void {
    this.state.mindMap = mindMap;
  }

  addCost(amount: Money): void {
    this.state.cost = this.state.cost.add(amount);
  }

  toggleStar(): void {
    this.state.starred = !this.state.starred;
  }

  addTag(tag: string): void {
    const t = tag.trim().toLowerCase();
    if (t.length === 0) return;
    if (!this.state.tags.includes(t)) this.state.tags.push(t);
  }

  fullText(): TranscriptText {
    return this.state.segments.reduce((acc, seg) => acc.concat(seg.text), TranscriptText.empty());
  }
}
