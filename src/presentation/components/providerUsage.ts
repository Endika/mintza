import type { ApiKeys, QualityProfile } from '../../domain/meeting/ports/ConfigRepository';
import {
  SUMMARY_CHAINS,
  TRANSCRIPTION_CHAINS,
  firstUsableSummary,
  firstUsableTranscription,
  type SummaryStep,
  type TranscriptionStep,
} from '../../domain/meeting/services/ProviderChains';
import { SUMMARY_MODEL } from '../../shared/constants/models';
import type { LanguageCode } from '../../domain/language/value-objects/Language';
import type { TranslationKey } from '../i18n/translations';
import { TRANSCRIPTION_LABEL, modelLabel } from './providerLabels';

type T = (key: TranslationKey, vars?: Record<string, string | number>) => string;

export interface ProviderUsage {
  readonly kind: 'uses' | 'needs-key';
  readonly text: string;
}

const TRANSCRIPTION_VENDOR_KEY: Record<TranscriptionStep, TranslationKey> = {
  'gpt-transcribe': 'settings.provider_openai',
  google: 'settings.provider_google_speech',
  azure: 'settings.provider_azure',
};

const SUMMARY_VENDOR_KEY: Record<SummaryStep, TranslationKey> = {
  openai: 'settings.provider_openai',
  'openai-reasoning': 'settings.provider_openai',
  anthropic: 'settings.provider_anthropic',
  gemini: 'settings.provider_google',
};

const SUMMARY_VENDOR: Record<SummaryStep, string> = {
  openai: 'OpenAI',
  'openai-reasoning': 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Google',
};

const transcriptionName = (step: TranscriptionStep): string =>
  step === 'gpt-transcribe' ? `${TRANSCRIPTION_LABEL[step]} (OpenAI)` : TRANSCRIPTION_LABEL[step];

const summaryName = (step: SummaryStep, t: T): string => {
  const model =
    step === 'openai-reasoning'
      ? `${modelLabel(SUMMARY_MODEL.openai)} ${t('settings.with_reasoning')}`
      : modelLabel(SUMMARY_MODEL[step]);
  return `${model} (${SUMMARY_VENDOR[step]})`;
};

const uses = (provider: string, t: T): ProviderUsage => ({
  kind: 'uses',
  text: t('settings.uses_provider', { provider }),
});

const needsKey = (
  keyLabels: readonly TranslationKey[],
  language: LanguageCode,
  t: T,
): ProviderUsage => {
  const names = [...new Set(keyLabels)].map((key) => t(key));
  const providers = new Intl.ListFormat(language, { type: 'disjunction' }).format(names);
  return { kind: 'needs-key', text: t('settings.needs_key', { providers }) };
};

export const transcriptionUsage = (
  profile: QualityProfile,
  keys: ApiKeys,
  language: LanguageCode,
  t: T,
): ProviderUsage => {
  const chain = TRANSCRIPTION_CHAINS[profile];
  const step = firstUsableTranscription(chain, keys);
  return step
    ? uses(transcriptionName(step), t)
    : needsKey(
        chain.map((s) => TRANSCRIPTION_VENDOR_KEY[s]),
        language,
        t,
      );
};

export const summaryUsage = (
  profile: QualityProfile,
  keys: ApiKeys,
  language: LanguageCode,
  t: T,
): ProviderUsage => {
  const chain = SUMMARY_CHAINS[profile];
  const step = firstUsableSummary(chain, keys);
  return step
    ? uses(summaryName(step, t), t)
    : needsKey(
        chain.map((s) => SUMMARY_VENDOR_KEY[s]),
        language,
        t,
      );
};
