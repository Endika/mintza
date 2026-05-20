const MICRO = 1_000_000;

export class Money {
  private constructor(public readonly microUsd: number) {}

  static zero(): Money {
    return new Money(0);
  }

  static fromUsd(usd: number): Money {
    if (!Number.isFinite(usd)) {
      throw new Error('Money amount must be a finite number');
    }
    return new Money(Math.round(usd * MICRO));
  }

  add(other: Money): Money {
    return new Money(this.microUsd + other.microUsd);
  }

  toUsd(): number {
    return this.microUsd / MICRO;
  }

  format(decimals: number = 4): string {
    return `$${this.toUsd().toFixed(decimals)}`;
  }

  equals(other: Money): boolean {
    return this.microUsd === other.microUsd;
  }
}
