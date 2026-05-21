import { PRICING, type LLMPricing } from '../../../shared/constants/pricing';
import { Money } from '../value-objects/Money';
import { TokenCount } from '../value-objects/TokenCount';

export class CostCalculator {
  whisperCost(durationMs: number): Money {
    if (durationMs <= 0) return Money.zero();
    return Money.fromUsd((durationMs / 60_000) * PRICING.whisper.perMinuteUsd);
  }

  llmCost(model: string, tokensIn: TokenCount, tokensOut: TokenCount): Money {
    const pricing: LLMPricing | undefined = PRICING.llm[model];
    if (!pricing) return Money.zero();
    const inCost = (tokensIn.value / 1_000_000) * pricing.inputPerMillion;
    const outCost = (tokensOut.value / 1_000_000) * pricing.outputPerMillion;
    return Money.fromUsd(inCost + outCost);
  }

  estimateLlmInputCost(model: string, transcriptText: string): Money {
    const tokens = TokenCount.estimateFromText(transcriptText);
    return this.llmCost(model, tokens, TokenCount.zero());
  }
}
