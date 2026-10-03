import { PRICING } from '../../../shared/constants/pricing';
import type { QualityProfile } from '../../meeting/ports/ConfigRepository';
import { Money } from '../value-objects/Money';

const WORDS_PER_MINUTE = 150;
const CHARS_PER_WORD = 6;
const CHARS_PER_TOKEN = 4;
const SUMMARY_MAX_OUT = 1024;
const MINDMAP_MAX_OUT = 1500;
const MODEL_BY_PROFILE: Record<QualityProfile, string> = {
  cheap: 'gpt-4o-mini',
  balanced: 'gpt-4o-mini',
  premium: 'gpt-4o',
};

/** One LLM call per summary the template asks for, plus the mind map. */
export const estimateOpenAiHourlyCost = (profile: QualityProfile, summaryCalls: number): Money => {
  const transcription = 60 * (PRICING.transcription.whisper?.perMinuteUsd ?? 0);
  const transcriptTokens = (60 * WORDS_PER_MINUTE * CHARS_PER_WORD) / CHARS_PER_TOKEN;
  const llm = PRICING.llm[MODEL_BY_PROFILE[profile]];
  if (!llm) return Money.fromUsd(transcription);
  const input = (((summaryCalls + 1) * transcriptTokens) / 1_000_000) * llm.inputPerMillion;
  const output =
    ((summaryCalls * SUMMARY_MAX_OUT + MINDMAP_MAX_OUT) / 1_000_000) * llm.outputPerMillion;
  return Money.fromUsd(transcription + input + output);
};
