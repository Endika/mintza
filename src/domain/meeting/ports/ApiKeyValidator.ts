import type { AppError } from '../../../shared/errors/AppError';
import type { Result } from '../../../shared/result/Result';

export type ApiKeyProviderName = 'openai' | 'anthropic' | 'google' | 'azure';

export interface ServiceCheck {
  readonly service: string;
  readonly ok: boolean;
  readonly message?: string;
}

export interface ValidationOutcome {
  readonly checks: readonly ServiceCheck[];
}

export interface ApiKeyValidator {
  validate(
    provider: ApiKeyProviderName,
    key: string,
  ): Promise<Result<ValidationOutcome, AppError>>;
}
