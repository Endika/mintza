import { PRICING } from '../../../shared/constants/pricing';
import type { Meeting } from '../../meeting/entities/Meeting';
import type { LLMProviderName } from '../../summary/value-objects/LLMProvider';
import type { TranscriptionProviderName } from '../../transcription/value-objects/TranscriptionProvider';
import { Money } from '../value-objects/Money';
import { CostCalculator } from './CostCalculator';

export interface MeetingCostBreakdown {
  readonly transcription: Map<TranscriptionProviderName, Money>;
  readonly llm: Map<LLMProviderName, Money>;
  readonly mindMap: Money;
  readonly total: Money;
}

/** Prices a summary whose model is unrecorded or missing from the price table. */
const FALLBACK_MODEL: Record<LLMProviderName, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-sonnet-5-5',
  gemini: 'gemini-3.1-flash-lite',
};

const calculator = new CostCalculator();

const pricedModel = (model: string | undefined, provider: LLMProviderName): string =>
  model !== undefined && PRICING.llm[model] ? model : FALLBACK_MODEL[provider];

export const meetingCost = (meeting: Meeting): MeetingCostBreakdown => {
  const transcription = new Map<TranscriptionProviderName, Money>();
  for (const segment of meeting.segments) {
    const cost = calculator.transcriptionCost(segment.provider, segment.durationMs);
    transcription.set(
      segment.provider,
      (transcription.get(segment.provider) ?? Money.zero()).add(cost),
    );
  }
  const llm = new Map<LLMProviderName, Money>();
  for (const summary of meeting.summaries.values()) {
    const model = pricedModel(summary.model, summary.provider);
    const cost = calculator.llmCost(model, summary.tokensIn, summary.tokensOut);
    llm.set(summary.provider, (llm.get(summary.provider) ?? Money.zero()).add(cost));
  }
  const usage = meeting.mindMap?.usage;
  // The mind map always runs on OpenAI.
  const mindMap = usage
    ? calculator.llmCost(pricedModel(usage.model, 'openai'), usage.tokensIn, usage.tokensOut)
    : Money.zero();
  const total = [...transcription.values(), ...llm.values()].reduce(
    (sum, cost) => sum.add(cost),
    mindMap,
  );
  return { transcription, llm, mindMap, total };
};
