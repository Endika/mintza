export const LLM_PROVIDERS = ['openai', 'anthropic', 'gemini'] as const;

export type LLMProviderName = (typeof LLM_PROVIDERS)[number];
