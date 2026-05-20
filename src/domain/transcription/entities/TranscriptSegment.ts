import type { TranscriptText } from '../value-objects/TranscriptText';
import type { TranscriptionProviderName } from '../value-objects/TranscriptionProvider';

export interface TranscriptSegmentProps {
  readonly id: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly text: TranscriptText;
  readonly provider: TranscriptionProviderName;
  readonly confidence?: number;
}

export class TranscriptSegment {
  constructor(private readonly props: TranscriptSegmentProps) {
    if (props.endMs < props.startMs) {
      throw new Error('TranscriptSegment endMs must be >= startMs');
    }
    if (props.confidence !== undefined && (props.confidence < 0 || props.confidence > 1)) {
      throw new Error('TranscriptSegment confidence must be in [0,1]');
    }
  }

  get id(): string {
    return this.props.id;
  }

  get startMs(): number {
    return this.props.startMs;
  }

  get endMs(): number {
    return this.props.endMs;
  }

  get text(): TranscriptText {
    return this.props.text;
  }

  get provider(): TranscriptionProviderName {
    return this.props.provider;
  }

  get confidence(): number | undefined {
    return this.props.confidence;
  }

  get durationMs(): number {
    return this.props.endMs - this.props.startMs;
  }
}
