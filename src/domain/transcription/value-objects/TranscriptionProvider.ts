export const TRANSCRIPTION_PROVIDERS = [
  'whisper',
  'gpt-transcribe',
  'google',
  'azure',
  'webspeech',
] as const;

export type TranscriptionProviderName = (typeof TRANSCRIPTION_PROVIDERS)[number];
