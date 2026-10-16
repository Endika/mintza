import { PRICING } from '../../../shared/constants/pricing';
import type { QualityProfile } from '../../meeting/ports/ConfigRepository';
import { Money } from '../value-objects/Money';

const WORDS_PER_MINUTE = 150;
const CHARS_PER_WORD = 6;
const CHARS_PER_TOKEN = 4;
const MINDMAP_MAX_OUT = 1500;
const MODEL = 'gpt-6-luna';
// Premium summaries reason first, so they get a larger completion budget.
const SUMMARY_MAX_OUT_BY_PROFILE: Record<QualityProfile, number> = {
  cheap: 1024,
  balanced: 1024,
  premium: 4096,
};

/** One LLM call per summary the template asks for, plus the mind map. */
export const estimateOpenAiHourlyCost = (profile: QualityProfile, summaryCalls: number): Money => {
  const transcription = 60 * (PRICING.transcription['gpt-transcribe']?.perMinuteUsd ?? 0);
  const transcriptTokens = (60 * WORDS_PER_MINUTE * CHARS_PER_WORD) / CHARS_PER_TOKEN;
  const llm = PRICING.llm[MODEL];
  if (!llm) return Money.fromUsd(transcription);
  const input = (((summaryCalls + 1) * transcriptTokens) / 1_000_000) * llm.inputPerMillion;
  const output =
    ((summaryCalls * SUMMARY_MAX_OUT_BY_PROFILE[profile] + MINDMAP_MAX_OUT) / 1_000_000) *
    llm.outputPerMillion;
  return Money.fromUsd(transcription + input + output);
};
