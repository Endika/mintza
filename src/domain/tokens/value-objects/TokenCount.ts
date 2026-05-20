const CHARS_PER_TOKEN = 4;

export class TokenCount {
  private constructor(public readonly value: number) {}

  static of(value: number): TokenCount {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`TokenCount must be a non-negative integer, got ${value}`);
    }
    return new TokenCount(value);
  }

  static zero(): TokenCount {
    return new TokenCount(0);
  }

  static estimateFromText(text: string): TokenCount {
    return new TokenCount(Math.ceil(text.length / CHARS_PER_TOKEN));
  }

  add(other: TokenCount): TokenCount {
    return new TokenCount(this.value + other.value);
  }

  equals(other: TokenCount): boolean {
    return this.value === other.value;
  }
}
