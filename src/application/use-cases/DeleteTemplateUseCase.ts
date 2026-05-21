import type { MeetingRepository } from '../../domain/meeting/ports/MeetingRepository';
import type { TemplateRegistry } from '../../domain/meeting/services/TemplateRegistry';
import { AppError } from '../../shared/errors/AppError';
import { err, type Result } from '../../shared/result/Result';

export interface DeleteTemplateInput {
  readonly id: string;
}

export class DeleteTemplateUseCase {
  constructor(
    private readonly registry: TemplateRegistry,
    private readonly meetings: MeetingRepository,
  ) {}

  async execute(input: DeleteTemplateInput): Promise<Result<void, AppError>> {
    const meetingsResult = await this.meetings.list();
    if (!meetingsResult.ok) return meetingsResult;
    const usedBy = meetingsResult.value.filter((m) => m.templateKind === input.id).length;
    if (usedBy > 0) {
      return err(
        new AppError(
          'CONFIG_INVALID',
          `Template is used by ${usedBy} meeting(s). Delete those first or assign them to another template.`,
        ),
      );
    }
    return this.registry.delete(input.id);
  }
}
