import type { TemplateRegistry } from '../../domain/meeting/services/TemplateRegistry';
import type { AppError } from '../../shared/errors/AppError';
import type { Result } from '../../shared/result/Result';

export interface DeleteTemplateInput {
  readonly id: string;
}

export class DeleteTemplateUseCase {
  constructor(private readonly registry: TemplateRegistry) {}

  execute(input: DeleteTemplateInput): Promise<Result<void, AppError>> {
    return this.registry.delete(input.id);
  }
}
