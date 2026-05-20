import type { AppConfig, ConfigRepository } from '../../domain/meeting/ports/ConfigRepository';
import type { AppError } from '../../shared/errors/AppError';
import type { Result } from '../../shared/result/Result';

export class GetConfigUseCase {
  constructor(private readonly repository: ConfigRepository) {}

  execute(): Promise<Result<AppConfig, AppError>> {
    return this.repository.load();
  }
}
