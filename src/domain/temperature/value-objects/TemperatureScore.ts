export type TemperatureBand =
  'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';

export class TemperatureScore {
  private constructor(public readonly value: number) {}

  static of(raw: number): TemperatureScore {
    if (!Number.isFinite(raw)) {
      throw new Error('TemperatureScore must be a finite number');
    }
    const clamped = Math.max(0, Math.min(100, raw));
    return new TemperatureScore(clamped);
  }

  band(): TemperatureBand {
    const v = this.value;
    if (v < 20) return 'very_negative';
    if (v < 40) return 'negative';
    if (v < 60) return 'neutral';
    if (v < 80) return 'positive';
    return 'very_positive';
  }

  equals(other: TemperatureScore): boolean {
    return this.value === other.value;
  }
}
