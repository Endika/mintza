export interface AudioChunkProps {
  readonly blob: Blob;
  readonly startMs: number;
  readonly endMs: number;
  readonly mimeType: string;
}

export class AudioChunk {
  constructor(private readonly props: AudioChunkProps) {
    if (props.endMs < props.startMs) {
      throw new Error('AudioChunk endMs must be >= startMs');
    }
  }

  get blob(): Blob {
    return this.props.blob;
  }

  get startMs(): number {
    return this.props.startMs;
  }

  get endMs(): number {
    return this.props.endMs;
  }

  get mimeType(): string {
    return this.props.mimeType;
  }

  get durationMs(): number {
    return this.props.endMs - this.props.startMs;
  }
}
