import { exportFilename } from '../../domain/meeting/services/MeetingExporter';
import type { TemplateRegistry } from '../../domain/meeting/services/TemplateRegistry';
import { serializeTemplates } from '../../domain/meeting/services/TemplateTransfer';
import { AppError } from '../../shared/errors/AppError';
import { err, ok, type Result } from '../../shared/result/Result';

export interface ExportedTemplate {
  readonly filename: string;
  readonly content: string;
}

export class ExportTemplateUseCase {
  constructor(private readonly registry: TemplateRegistry) {}

  async execute(id: string): Promise<Result<ExportedTemplate, AppError>> {
    const found = await this.registry.findById(id);
    if (!found.ok) return found;
    if (!found.value) {
      return err(new AppError('CONFIG_INVALID', `Template not found: ${id}`));
    }
    if (found.value.builtIn) {
      return err(
        new AppError(
          'CONFIG_INVALID',
          'Built-in templates are not exported',
          undefined,
          [],
          'builtin_readonly',
        ),
      );
    }
    const def = found.value.toDefinition();
    return ok({
      filename: exportFilename(def.name, 'mintza-template.json'),
      content: serializeTemplates([def]),
    });
  }
}
