export const TRANSCRIPTION_PROVIDERS = ['whisper', 'google', 'azure', 'webspeech'] as const;

export type TranscriptionProviderName = (typeof TRANSCRIPTION_PROVIDERS)[number];
