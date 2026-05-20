import { describe, expect, it } from 'vitest';
import { TemperatureScore } from '../../../src/domain/temperature/value-objects/TemperatureScore';

describe('TemperatureScore', () => {
  it('clamps negative values to 0', () => {
    expect(TemperatureScore.of(-12).value).toBe(0);
  });

  it('clamps values above 100 to 100', () => {
    expect(TemperatureScore.of(245).value).toBe(100);
  });

  it('rejects NaN', () => {
    expect(() => TemperatureScore.of(Number.NaN)).toThrow();
  });

  it.each([
    [0, 'very_negative'],
    [19.9, 'very_negative'],
    [20, 'negative'],
    [39.9, 'negative'],
    [40, 'neutral'],
    [59.9, 'neutral'],
    [60, 'positive'],
    [79.9, 'positive'],
    [80, 'very_positive'],
    [100, 'very_positive'],
  ])('value %d maps to band %s', (value, band) => {
    expect(TemperatureScore.of(value).band()).toBe(band);
  });
});
