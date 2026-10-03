import { describe, expect, it } from 'vitest';
import { estimateOpenAiHourlyCost } from '../../../src/domain/tokens/services/HourlyCostEstimate';

describe('estimateOpenAiHourlyCost', () => {
  it('prices an hour on the balanced profile at about forty cents', () => {
    const usd = estimateOpenAiHourlyCost('balanced').toUsd();
    expect(usd).toBeGreaterThan(0.37);
    expect(usd).toBeLessThan(0.42);
  });

  it('costs more on premium than on balanced', () => {
    expect(estimateOpenAiHourlyCost('premium').toUsd()).toBeGreaterThan(
      estimateOpenAiHourlyCost('balanced').toUsd(),
    );
  });
});
