import type { TemplateRegistry } from '../../domain/meeting/services/TemplateRegistry';
import type { TemplateDefinition } from '../../domain/meeting/value-objects/Template';
import type { AppError } from '../../shared/errors/AppError';
import type { Result } from '../../shared/result/Result';

export interface SaveTemplateInput {
  readonly definition: TemplateDefinition;
}

export class SaveTemplateUseCase {
  constructor(private readonly registry: TemplateRegistry) {}

  execute(input: SaveTemplateInput): Promise<Result<void, AppError>> {
    return this.registry.save(input.definition);
  }
}
