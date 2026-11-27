import { PRICING } from '../../../shared/constants/pricing';
import type { Meeting } from '../../meeting/entities/Meeting';
import { SUMMARY_KINDS, type SummaryKind } from '../../summary/value-objects/SummaryKind';
import type { LLMProviderName } from '../../summary/value-objects/LLMProvider';
import type { TranscriptionProviderName } from '../../transcription/value-objects/TranscriptionProvider';
import { Money } from '../value-objects/Money';
import { CostCalculator } from './CostCalculator';

/** Summaries that ran on one recorded model; a summary without one is grouped under its provider. */
export interface LlmCostGroup {
  readonly provider: LLMProviderName;
  readonly model?: string;
  readonly kinds: readonly SummaryKind[];
  readonly cost: Money;
}

export interface MeetingCostBreakdown {
  readonly transcription: Map<TranscriptionProviderName, Money>;
  readonly llm: readonly LlmCostGroup[];
  readonly mindMap: Money;
  readonly total: Money;
}

/**
 * Prices a summary whose model is unrecorded or missing from the price table. Unrecorded
 * summaries predate model tracking, so these stay the models that ran back then.
 */
const FALLBACK_MODEL: Record<LLMProviderName, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-sonnet-4-5',
  gemini: 'gemini-2.0-flash',
};

const calculator = new CostCalculator();

const pricedModel = (model: string | undefined, provider: LLMProviderName): string =>
  model !== undefined && PRICING.llm[model] ? model : FALLBACK_MODEL[provider];

const llmCostGroups = (meeting: Meeting): LlmCostGroup[] => {
  const groups = new Map<string, LlmCostGroup>();
  for (const kind of SUMMARY_KINDS) {
    const summary = meeting.summaries.get(kind);
    if (!summary) continue;
    const { provider, model } = summary;
    const cost = calculator.llmCost(
      pricedModel(model, provider),
      summary.tokensIn,
      summary.tokensOut,
    );
    const id = model ?? provider;
    const group = groups.get(id);
    groups.set(id, {
      provider,
      ...(model !== undefined ? { model } : {}),
      kinds: [...(group?.kinds ?? []), kind],
      cost: (group?.cost ?? Money.zero()).add(cost),
    });
  }
  return [...groups.values()];
};

export const meetingCost = (meeting: Meeting): MeetingCostBreakdown => {
  const transcription = new Map<TranscriptionProviderName, Money>();
  for (const segment of meeting.segments) {
    const cost = calculator.transcriptionCost(segment.provider, segment.durationMs);
    transcription.set(
      segment.provider,
      (transcription.get(segment.provider) ?? Money.zero()).add(cost),
    );
  }
  const llm = llmCostGroups(meeting);
  const usage = meeting.mindMap?.usage;
  // The mind map always runs on OpenAI.
  const mindMap = usage
    ? calculator.llmCost(pricedModel(usage.model, 'openai'), usage.tokensIn, usage.tokensOut)
    : Money.zero();
  const total = [...transcription.values(), ...llm.map((group) => group.cost)].reduce(
    (sum, cost) => sum.add(cost),
    mindMap,
  );
  return { transcription, llm, mindMap, total };
};
