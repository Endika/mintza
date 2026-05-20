export class TranscriptText {
  private constructor(public readonly value: string) {}

  static of(raw: string): TranscriptText {
    return new TranscriptText(raw.trim());
  }

  static empty(): TranscriptText {
    return new TranscriptText('');
  }

  isEmpty(): boolean {
    return this.value.length === 0;
  }

  wordCount(): number {
    if (this.isEmpty()) return 0;
    return this.value.split(/\s+/).length;
  }

  concat(other: TranscriptText, separator: string = ' '): TranscriptText {
    if (this.isEmpty()) return other;
    if (other.isEmpty()) return this;
    return new TranscriptText(`${this.value}${separator}${other.value}`);
  }

  equals(other: TranscriptText): boolean {
    return this.value === other.value;
  }
}
