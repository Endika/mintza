import { describe, expect, it } from 'vitest';
import { CostCalculator } from '../../../src/domain/tokens/services/CostCalculator';
import { TokenCount } from '../../../src/domain/tokens/value-objects/TokenCount';

describe('CostCalculator', () => {
  const calc = new CostCalculator();

  it('returns zero for zero or negative durations', () => {
    expect(calc.whisperCost(0).toUsd()).toBe(0);
    expect(calc.whisperCost(-50).toUsd()).toBe(0);
  });

  it('prices one minute of Whisper at the listed rate', () => {
    expect(calc.whisperCost(60_000).format()).toBe('$0.0060');
  });

  it('prices ten minutes of Whisper as ten times one minute', () => {
    expect(calc.whisperCost(600_000).format()).toBe('$0.0600');
  });

  it('returns zero for unknown LLM model', () => {
    const cost = calc.llmCost('unknown-model', TokenCount.of(1000), TokenCount.of(500));
    expect(cost.toUsd()).toBe(0);
  });

  it('prices gpt-4o-mini correctly', () => {
    const cost = calc.llmCost('gpt-4o-mini', TokenCount.of(1_000_000), TokenCount.of(500_000));
    expect(cost.toUsd()).toBeCloseTo(0.15 + 0.5 * 0.6, 6);
  });

  it('estimates from text without output tokens', () => {
    const cost = calc.estimateLlmInputCost('gpt-4o-mini', 'a'.repeat(400));
    expect(cost.toUsd()).toBeGreaterThan(0);
  });
});
