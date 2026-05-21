import type { AppError } from '../../../shared/errors/AppError';
import { err, ok, type Result } from '../../../shared/result/Result';
import type { TemplateRepository } from '../ports/TemplateRepository';
import {
  BUILT_IN_TEMPLATES,
  Template,
  type TemplateDefinition,
} from '../value-objects/Template';

export class TemplateRegistry {
  constructor(private readonly repository: TemplateRepository) {}

  async list(): Promise<Result<Template[], AppError>> {
    const loaded = await this.repository.load();
    if (!loaded.ok) return loaded;
    const builtIn = Object.values(BUILT_IN_TEMPLATES).map((d) => Template.fromDefinition(d));
    const custom = loaded.value.map((d) => Template.fromDefinition(d));
    return ok([...builtIn, ...custom]);
  }

  async findById(id: string): Promise<Result<Template | null, AppError>> {
    if (id in BUILT_IN_TEMPLATES) {
      return ok(Template.fromDefinition(BUILT_IN_TEMPLATES[id as keyof typeof BUILT_IN_TEMPLATES]));
    }
    const loaded = await this.repository.load();
    if (!loaded.ok) return loaded;
    const match = loaded.value.find((d) => d.id === id);
    return ok(match ? Template.fromDefinition(match) : null);
  }

  async resolveOrFallback(id: string): Promise<Template> {
    const result = await this.findById(id);
    if (result.ok && result.value) return result.value;
    return Template.generic();
  }

  save(definition: TemplateDefinition): Promise<Result<void, AppError>> {
    if (definition.id.trim().length === 0) {
      return Promise.resolve(err({ code: 'CONFIG_INVALID', message: 'Empty id' } as AppError));
    }
    return this.repository.save(definition);
  }

  delete(id: string): Promise<Result<void, AppError>> {
    return this.repository.delete(id);
  }
}
