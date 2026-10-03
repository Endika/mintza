import { describe, expect, it } from 'vitest';
import { CostCalculator } from '../../../src/domain/tokens/services/CostCalculator';
import { TokenCount } from '../../../src/domain/tokens/value-objects/TokenCount';

describe('CostCalculator', () => {
  const calc = new CostCalculator();

  it('returns zero for zero or negative durations', () => {
    expect(calc.transcriptionCost('whisper', 0).toUsd()).toBe(0);
    expect(calc.transcriptionCost('whisper', -50).toUsd()).toBe(0);
  });

  it('prices one minute of Whisper at the listed rate', () => {
    expect(calc.transcriptionCost('whisper', 60_000).format()).toBe('$0.0060');
  });

  it('prices one minute of gpt-transcribe at its own rate', () => {
    expect(calc.transcriptionCost('gpt-transcribe', 60_000).toUsd()).toBeCloseTo(0.0045, 6);
  });

  it('prices Google Speech cheaper than Whisper', () => {
    const whisper = calc.transcriptionCost('whisper', 60_000).toUsd();
    const google = calc.transcriptionCost('google', 60_000).toUsd();
    expect(google).toBeLessThan(whisper);
  });

  it('charges nothing for the Web Speech fallback', () => {
    expect(calc.transcriptionCost('webspeech', 60_000).toUsd()).toBe(0);
  });

  it('returns zero for unknown LLM model', () => {
    const cost = calc.llmCost('unknown-model', TokenCount.of(1000), TokenCount.of(500));
    expect(cost.toUsd()).toBe(0);
  });

  it('prices gpt-4o-mini correctly', () => {
    const cost = calc.llmCost('gpt-4o-mini', TokenCount.of(1_000_000), TokenCount.of(500_000));
    expect(cost.toUsd()).toBeCloseTo(0.15 + 0.5 * 0.6, 6);
  });

  it('prices gpt-4o at $2.50 in and $10 out per million tokens', () => {
    const cost = calc.llmCost('gpt-4o', TokenCount.of(1_000_000), TokenCount.of(1_000_000));
    expect(cost.toUsd()).toBeCloseTo(2.5 + 10, 6);
  });
});
