export interface LLMPricing {
  readonly inputPerMillion: number;
  readonly outputPerMillion: number;
}

export interface TranscriptionPricing {
  readonly perMinuteUsd: number;
}

export const PRICING = {
  transcription: {
    whisper: { perMinuteUsd: 0.006 },
    google: { perMinuteUsd: 0.004 },
    azure: { perMinuteUsd: 0.005 },
    webspeech: { perMinuteUsd: 0 },
  } as Readonly<Record<string, TranscriptionPricing>>,
  llm: {
    'gpt-4o-mini': { inputPerMillion: 0.15, outputPerMillion: 0.6 },
    'gpt-4o': { inputPerMillion: 5, outputPerMillion: 15 },
    'claude-sonnet-5-5': { inputPerMillion: 2, outputPerMillion: 10 },
    // Retires on 2026-11-30; kept so meetings summarised with it still price correctly.
    'claude-sonnet-4-5': { inputPerMillion: 3, outputPerMillion: 15 },
    'gemini-3.1-flash-lite': { inputPerMillion: 0.25, outputPerMillion: 1.5 },
    // Retired on 2026-06-01; kept so meetings summarised with it still price correctly.
    'gemini-2.0-flash': { inputPerMillion: 0.1, outputPerMillion: 0.4 },
  } as Readonly<Record<string, LLMPricing>>,
} as const;
