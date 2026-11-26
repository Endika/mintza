import type { TemplateRegistry } from '../../domain/meeting/services/TemplateRegistry';
import { parseTemplates } from '../../domain/meeting/services/TemplateTransfer';
import type { TemplateDefinition } from '../../domain/meeting/value-objects/Template';
import { generateTemplateId } from '../../domain/meeting/value-objects/TemplateId';
import type { AppError } from '../../shared/errors/AppError';
import { err, ok, type Result } from '../../shared/result/Result';

export interface ImportTemplatesInput {
  readonly text: string;
  readonly copySuffix: string;
}

export class ImportTemplatesUseCase {
  constructor(
    private readonly registry: TemplateRegistry,
    private readonly generateId: (name: string) => string = generateTemplateId,
  ) {}

  async execute(input: ImportTemplatesInput): Promise<Result<TemplateDefinition[], AppError>> {
    const parsed = parseTemplates(input.text);
    if (!parsed.ok) return parsed;
    const existing = await this.registry.list();
    if (!existing.ok) return existing;
    const taken = new Set(existing.value.map((t) => t.id));
    const saved: TemplateDefinition[] = [];
    for (const def of parsed.value) {
      const definition = taken.has(def.id) ? this.asCopy(def, input.copySuffix, taken) : def;
      taken.add(definition.id);
      const result = await this.registry.save(definition);
      if (!result.ok) return err(result.error);
      saved.push(definition);
    }
    return ok(saved);
  }

  private asCopy(
    def: TemplateDefinition,
    copySuffix: string,
    taken: ReadonlySet<string>,
  ): TemplateDefinition {
    return { ...def, id: this.freeId(def.name, taken), name: `${def.name} (${copySuffix})` };
  }

  private freeId(name: string, taken: ReadonlySet<string>): string {
    let id = this.generateId(name);
    while (taken.has(id)) id = this.generateId(name);
    return id;
  }
}
