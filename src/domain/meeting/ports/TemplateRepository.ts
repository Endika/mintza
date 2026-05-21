import type { AppError } from '../../../shared/errors/AppError';
import type { Result } from '../../../shared/result/Result';
import type { TemplateDefinition } from '../value-objects/Template';

export interface TemplateRepository {
  load(): Promise<Result<TemplateDefinition[], AppError>>;
  save(definition: TemplateDefinition): Promise<Result<void, AppError>>;
  delete(id: string): Promise<Result<void, AppError>>;
}
