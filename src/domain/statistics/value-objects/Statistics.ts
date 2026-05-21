import type { TranscriptionProviderName } from '../../transcription/value-objects/TranscriptionProvider';

export interface KeywordFrequency {
  readonly term: string;
  readonly count: number;
}

export interface Statistics {
  readonly durationMs: number;
  readonly wordCount: number;
  readonly wordsPerMinute: number;
  readonly topKeywords: readonly KeywordFrequency[];
  readonly providersUsed: readonly TranscriptionProviderName[];
}
