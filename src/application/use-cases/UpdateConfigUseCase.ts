import type { AppConfig, ConfigRepository } from '../../domain/meeting/ports/ConfigRepository';
import type { AppError } from '../../shared/errors/AppError';
import type { Result } from '../../shared/result/Result';

export interface UpdateConfigInput {
  readonly config: AppConfig;
}

export class UpdateConfigUseCase {
  constructor(private readonly repository: ConfigRepository) {}

  execute(input: UpdateConfigInput): Promise<Result<void, AppError>> {
    return this.repository.save(input.config);
  }
}
