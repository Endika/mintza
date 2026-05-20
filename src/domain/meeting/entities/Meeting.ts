import type { Language } from '../../language/value-objects/Language';
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
  cost: Money;
  starred: boolean;
  readonly tags: string[];
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
    });
  }

  static restore(state: MeetingState): Meeting {
    return new Meeting(state);
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

  get durationMs(): number {
    const end = this.state.endedAt ?? new Date();
    return end.getTime() - this.state.startedAt.getTime();
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
    this.state.endedAt = at;
  }

  setSummary(summary: Summary): void {
    this.state.summaries.set(summary.kind, summary);
  }

  setTemperature(score: TemperatureScore): void {
    this.state.temperature = score;
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
