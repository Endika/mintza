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

const MODEL_LABEL: Readonly<Record<string, string>> = {
  'gpt-6-luna': 'GPT-6 Luna',
  'gpt-4o-mini': 'GPT-4o mini',
  'gpt-4o': 'GPT-4o',
  'claude-sonnet-5-5': 'Claude Sonnet 5.5',
  'claude-sonnet-4-5': 'Claude Sonnet 4.5',
  'gemini-3.1-flash-lite': 'Gemini 3.1 Flash Lite',
  'gemini-2.0-flash': 'Gemini 2.0 Flash',
};

export const modelLabel = (id: string): string => MODEL_LABEL[id] ?? id;
