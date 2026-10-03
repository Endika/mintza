import type { AppError } from '../../../shared/errors/AppError';
import type { Result } from '../../../shared/result/Result';

export type ApiKeyProviderName = 'openai' | 'anthropic' | 'google' | 'googleSpeech' | 'azure';

/**
 * api_blocked: the key's restrictions don't allow this API.
 * key_restricted: the key's restrictions don't allow this site, IP or app.
 * api_disabled: the API isn't enabled in the key's project.
 */
export type CheckFailureReason =
  | 'invalid_key'
  | 'api_blocked'
  | 'key_restricted'
  | 'api_disabled'
  | 'billing_disabled'
  | 'network'
  | 'unknown';

export interface ServiceCheck {
  readonly service: string;
  readonly ok: boolean;
  readonly reason?: CheckFailureReason;
}

export interface ValidationOutcome {
  readonly checks: readonly ServiceCheck[];
}

export interface ApiKeyValidator {
  validate(provider: ApiKeyProviderName, key: string): Promise<Result<ValidationOutcome, AppError>>;
}
