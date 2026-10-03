import type { LLMProviderName } from '../../domain/summary/value-objects/LLMProvider';
import type { TranscriptionProviderName } from '../../domain/transcription/value-objects/TranscriptionProvider';

export const TRANSCRIPTION_LABEL: Record<TranscriptionProviderName, string> = {
  whisper: 'Whisper',
  'gpt-transcribe': 'GPT Transcribe',
  google: 'Google Speech',
  azure: 'Azure Speech',
  webspeech: 'Web Speech',
};

export const LLM_LABEL: Record<LLMProviderName, string> = {
  openai: 'GPT',
  anthropic: 'Claude',
  gemini: 'Gemini',
};

export const transcriptionLabel = (id: string): string =>
  (TRANSCRIPTION_LABEL as Readonly<Record<string, string | undefined>>)[id] ?? id;
