import type { ApiKeys, QualityProfile } from '../ports/ConfigRepository';
import type { TranscriptionProviderName } from '../../transcription/value-objects/TranscriptionProvider';
import type { LLMProviderName } from '../../summary/value-objects/LLMProvider';

export type TranscriptionStep = Extract<
  TranscriptionProviderName,
  'gpt-transcribe' | 'google' | 'azure'
>;
export type SummaryStep = LLMProviderName | 'openai-reasoning';

export const TRANSCRIPTION_CHAINS: Record<QualityProfile, readonly TranscriptionStep[]> = {
  cheap: ['google', 'gpt-transcribe'],
  balanced: ['gpt-transcribe', 'google'],
  premium: ['gpt-transcribe', 'azure'],
};

export const SUMMARY_CHAINS: Record<QualityProfile, readonly SummaryStep[]> = {
  cheap: ['gemini', 'anthropic', 'openai'],
  balanced: ['openai', 'anthropic', 'gemini'],
  premium: ['openai-reasoning'],
};

const present = (key: string | undefined): string | undefined =>
  key === undefined || key.trim() === '' ? undefined : key;

/**
 * Falls back to a legacy Gemini key that may cover both, but never to an `AQ.` auth key:
 * those only work on Gemini, and every chunk would be uploaded to Speech for a certain 401.
 */
export const googleSpeechKey = (keys: ApiKeys): string | undefined => {
  const speech = present(keys.googleSpeech);
  if (speech !== undefined) return speech;
  const google = present(keys.google);
  return google?.startsWith('AQ.') ? undefined : google;
};

export const transcriptionKey = (step: TranscriptionStep, keys: ApiKeys): string | undefined => {
  switch (step) {
    case 'gpt-transcribe':
      return present(keys.openai);
    case 'google':
      return googleSpeechKey(keys);
    case 'azure':
      return present(keys.azure);
  }
};

export const summaryKey = (step: SummaryStep, keys: ApiKeys): string | undefined => {
  switch (step) {
    case 'openai':
    case 'openai-reasoning':
      return present(keys.openai);
    case 'anthropic':
      return present(keys.anthropic);
    case 'gemini':
      return present(keys.google);
  }
};

export const firstUsableProvider = <Step>(
  chain: readonly Step[],
  hasKey: (step: Step) => boolean,
): Step | undefined => chain.find(hasKey);

export const firstUsableTranscription = (
  chain: readonly TranscriptionStep[],
  keys: ApiKeys,
): TranscriptionStep | undefined =>
  firstUsableProvider(chain, (step) => transcriptionKey(step, keys) !== undefined);

export const firstUsableSummary = (
  chain: readonly SummaryStep[],
  keys: ApiKeys,
): SummaryStep | undefined =>
  firstUsableProvider(chain, (step) => summaryKey(step, keys) !== undefined);
