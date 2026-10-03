import { describe, expect, it } from 'vitest';
import { estimateOpenAiHourlyCost } from '../../../src/domain/tokens/services/HourlyCostEstimate';

describe('estimateOpenAiHourlyCost', () => {
  it('prices an hour of eight summaries on the balanced profile at about thirty cents', () => {
    const usd = estimateOpenAiHourlyCost('balanced', 8).toUsd();
    expect(usd).toBeGreaterThan(0.28);
    expect(usd).toBeLessThan(0.33);
  });

  it('prices the hour of audio at the gpt-transcribe rate', () => {
    // 60 min at $0.0045, plus the mind map: 13,500 tokens in and 1,500 out on gpt-4o-mini.
    const usd = estimateOpenAiHourlyCost('balanced', 0).toUsd();
    expect(usd).toBeCloseTo(0.27 + 0.013_5 * 0.15 + 0.001_5 * 0.6, 6);
  });

  it('costs more on premium than on balanced', () => {
    expect(estimateOpenAiHourlyCost('premium', 8).toUsd()).toBeGreaterThan(
      estimateOpenAiHourlyCost('balanced', 8).toUsd(),
    );
  });

  it('costs less when the template asks for fewer summaries', () => {
    expect(estimateOpenAiHourlyCost('balanced', 3).toUsd()).toBeLessThan(
      estimateOpenAiHourlyCost('balanced', 8).toUsd(),
    );
  });
});
