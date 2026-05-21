import type { AppError } from '../../../shared/errors/AppError';
import type { Result } from '../../../shared/result/Result';

export type ApiKeyProviderName = 'openai' | 'anthropic' | 'google' | 'azure';

export interface ApiKeyValidator {
  validate(provider: ApiKeyProviderName, key: string): Promise<Result<void, AppError>>;
}
