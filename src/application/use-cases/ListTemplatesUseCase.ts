import type { TemplateRegistry } from '../../domain/meeting/services/TemplateRegistry';
import type { Template } from '../../domain/meeting/value-objects/Template';
import type { AppError } from '../../shared/errors/AppError';
import type { Result } from '../../shared/result/Result';

export class ListTemplatesUseCase {
  constructor(private readonly registry: TemplateRegistry) {}

  execute(): Promise<Result<Template[], AppError>> {
    return this.registry.list();
  }
}
