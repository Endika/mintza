import { Meeting } from '../../domain/meeting/entities/Meeting';
import type { MeetingRepository } from '../../domain/meeting/ports/MeetingRepository';
import { parseMeeting, type ImportedMeeting } from '../../domain/meeting/services/MeetingTransfer';
import type { TemplateRegistry } from '../../domain/meeting/services/TemplateRegistry';
import { serializeTemplates } from '../../domain/meeting/services/TemplateTransfer';
import { MeetingId } from '../../domain/meeting/value-objects/MeetingId';
import { Template } from '../../domain/meeting/value-objects/Template';
import type { SentimentScoreParser } from '../../domain/temperature/services/SentimentScoreParser';
import { applySentimentScore } from '../../domain/temperature/services/applySentimentScore';
import { AppError } from '../../shared/errors/AppError';
import { err, ok, type Result } from '../../shared/result/Result';
import type { GenerateMindMapUseCase } from './GenerateMindMapUseCase';
import type { ImportTemplatesUseCase } from './ImportTemplatesUseCase';
import type { RegenerateSummariesUseCase } from './RegenerateSummariesUseCase';

export interface ImportPreview {
  readonly parsed: ImportedMeeting;
  readonly templateAvailable: boolean;
  readonly canRecreate: boolean;
}

export type TemplateChoice =
  | { readonly kind: 'as-is' }
  | { readonly kind: 'recreate' }
  | { readonly kind: 'use'; readonly templateId: string };

export interface ImportMeetingInput {
  readonly parsed: ImportedMeeting;
  readonly choice: TemplateChoice;
  /** Localized word put in parentheses after the title of a meeting imported as a copy. */
  readonly titleSuffix: string;
  /** Localized word for a recreated template whose id is already taken. */
  readonly copySuffix: string;
}

export interface ImportMeetingOutput {
  readonly meetingId: MeetingId;
  readonly regenerated: boolean;
  readonly successCount: number;
  readonly failureCount: number;
  readonly mindMapFailed: boolean;
}

export class ImportMeetingUseCase {
  constructor(
    private readonly repository: MeetingRepository,
    private readonly templateRegistry: TemplateRegistry,
    private readonly importTemplates: ImportTemplatesUseCase,
    private readonly regenerateSummaries: RegenerateSummariesUseCase,
    private readonly generateMindMap: GenerateMindMapUseCase,
    private readonly sentimentParser: SentimentScoreParser,
    private readonly clock: () => Date = () => new Date(),
    private readonly newId: () => MeetingId = () => MeetingId.generate(),
  ) {}

  async inspect(text: string): Promise<Result<ImportPreview, AppError>> {
    const parsed = parseMeeting(text);
    if (!parsed.ok) return parsed;
    const found = await this.templateRegistry.findById(parsed.value.templateId);
    if (!found.ok) return found;
    return ok({
      parsed: parsed.value,
      templateAvailable: found.value !== null,
      canRecreate: parsed.value.templateDefinition !== undefined,
    });
  }

  async execute(input: ImportMeetingInput): Promise<Result<ImportMeetingOutput, AppError>> {
    const template = await this.resolveTemplate(input);
    if (!template.ok) return template;
    const identity = await this.identityFor(input.parsed, input.titleSuffix);
    if (!identity.ok) return identity;
    const meeting = Meeting.restore({
      ...input.parsed.state,
      ...identity.value,
      template: template.value,
      importedAt: this.clock(),
    });
    const saved = await this.repository.save(meeting);
    if (!saved.ok) return saved;
    const base = { meetingId: meeting.id, mindMapFailed: false };
    if (input.choice.kind !== 'use') {
      return ok({ ...base, regenerated: false, successCount: 0, failureCount: 0 });
    }
    return ok({ ...base, ...(await this.regenerate(meeting, template.value)) });
  }

  private async resolveTemplate(input: ImportMeetingInput): Promise<Result<Template, AppError>> {
    const { choice, parsed } = input;
    if (choice.kind === 'recreate') return this.recreate(parsed, input.copySuffix);
    const id = choice.kind === 'use' ? choice.templateId : parsed.templateId;
    const found = await this.templateRegistry.findById(id);
    if (!found.ok) return found;
    return found.value ? ok(found.value) : err(templateMissing(id));
  }

  private async recreate(
    parsed: ImportedMeeting,
    copySuffix: string,
  ): Promise<Result<Template, AppError>> {
    if (!parsed.templateDefinition) return err(templateMissing(parsed.templateId));
    const saved = await this.importTemplates.execute({
      text: serializeTemplates([parsed.templateDefinition]),
      copySuffix,
    });
    if (!saved.ok) return saved;
    const [definition] = saved.value;
    // Stryker disable next-line ConditionalExpression,BlockStatement: importTemplates returns exactly one definition for a one-template file
    if (!definition) return err(templateMissing(parsed.templateId));
    return ok(Template.fromDefinition(definition));
  }

  private async identityFor(
    parsed: ImportedMeeting,
    titleSuffix: string,
  ): Promise<Result<{ id: MeetingId; title: string }, AppError>> {
    const { id, title } = parsed.state;
    const existing = await this.repository.findById(id);
    if (!existing.ok) return existing;
    if (existing.value === null) return ok({ id, title });
    return ok({ id: this.newId(), title: `${title} (${titleSuffix})` });
  }

  private async regenerate(
    imported: Meeting,
    template: Template,
  ): Promise<
    Pick<ImportMeetingOutput, 'regenerated' | 'successCount' | 'failureCount' | 'mindMapFailed'>
  > {
    const meeting = imported.withTemplate(template);
    const summaries = await this.regenerateSummaries.execute({ meeting, template });
    const mindMap = await this.generateMindMap.execute({ meeting });
    applySentimentScore(meeting, this.sentimentParser);
    const saved = await this.repository.save(meeting);
    return {
      regenerated: true,
      successCount: summaries.successCount,
      failureCount: summaries.failureCount + (saved.ok ? 0 : 1),
      mindMapFailed: !mindMap.ok,
    };
  }
}

const templateMissing = (id: string): AppError =>
  new AppError('CONFIG_INVALID', `Template not found: ${id}`, undefined, [], 'unknown');
