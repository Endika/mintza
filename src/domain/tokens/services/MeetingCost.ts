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

/** Summaries saved before the model was recorded are priced at each provider's default. */
const FALLBACK_MODEL: Record<LLMProviderName, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-sonnet-4-5',
  gemini: 'gemini-2.0-flash',
};

const calculator = new CostCalculator();

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
    const model = summary.model ?? FALLBACK_MODEL[summary.provider];
    const cost = calculator.llmCost(model, summary.tokensIn, summary.tokensOut);
    llm.set(summary.provider, (llm.get(summary.provider) ?? Money.zero()).add(cost));
  }
  const usage = meeting.mindMap?.usage;
  const mindMap = usage
    ? calculator.llmCost(usage.model, usage.tokensIn, usage.tokensOut)
    : Money.zero();
  const total = [...transcription.values(), ...llm.values()].reduce(
    (sum, cost) => sum.add(cost),
    mindMap,
  );
  return { transcription, llm, mindMap, total };
};
