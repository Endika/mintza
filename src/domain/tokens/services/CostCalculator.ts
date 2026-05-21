import { PRICING, type LLMPricing, type TranscriptionPricing } from '../../../shared/constants/pricing';
import type { TranscriptionProviderName } from '../../transcription/value-objects/TranscriptionProvider';
import { Money } from '../value-objects/Money';
import { TokenCount } from '../value-objects/TokenCount';

export class CostCalculator {
  transcriptionCost(provider: TranscriptionProviderName, durationMs: number): Money {
    if (durationMs <= 0) return Money.zero();
    const pricing: TranscriptionPricing | undefined = PRICING.transcription[provider];
    if (!pricing) return Money.zero();
    return Money.fromUsd((durationMs / 60_000) * pricing.perMinuteUsd);
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
