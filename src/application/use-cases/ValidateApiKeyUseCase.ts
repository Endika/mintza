import type {
  ApiKeyProviderName,
  ApiKeyValidator,
} from '../../domain/meeting/ports/ApiKeyValidator';
import type { AppError } from '../../shared/errors/AppError';
import type { Result } from '../../shared/result/Result';

export interface ValidateApiKeyInput {
  readonly provider: ApiKeyProviderName;
  readonly key: string;
}

export class ValidateApiKeyUseCase {
  constructor(private readonly validator: ApiKeyValidator) {}

  execute(input: ValidateApiKeyInput): Promise<Result<void, AppError>> {
    return this.validator.validate(input.provider, input.key);
  }
}
