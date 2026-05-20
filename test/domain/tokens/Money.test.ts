import { describe, expect, it } from 'vitest';
import { Money } from '../../../src/domain/tokens/value-objects/Money';

describe('Money', () => {
  it('keeps four decimal precision when formatting', () => {
    expect(Money.fromUsd(0.000123).format()).toBe('$0.0001');
  });

  it('adds amounts without floating point drift', () => {
    const total = Money.fromUsd(0.0001).add(Money.fromUsd(0.0002)).add(Money.fromUsd(0.0003));
    expect(total.format()).toBe('$0.0006');
  });

  it('rejects non finite values', () => {
    expect(() => Money.fromUsd(Number.POSITIVE_INFINITY)).toThrow();
  });

  it('treats equal amounts as equal', () => {
    expect(Money.fromUsd(0.05).equals(Money.fromUsd(0.05))).toBe(true);
  });
});
