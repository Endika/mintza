import { describe, expect, it } from 'vitest';
import { estimateOpenAiHourlyCost } from '../../../src/domain/tokens/services/HourlyCostEstimate';

describe('estimateOpenAiHourlyCost', () => {
  it('prices an hour of eight summaries on the balanced profile at about forty cents', () => {
    const usd = estimateOpenAiHourlyCost('balanced', 8).toUsd();
    expect(usd).toBeGreaterThan(0.37);
    expect(usd).toBeLessThan(0.42);
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
