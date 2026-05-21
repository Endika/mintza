import type { Meeting } from '../../domain/meeting/entities/Meeting';
import type { MeetingRepository } from '../../domain/meeting/ports/MeetingRepository';
import type { Template } from '../../domain/meeting/value-objects/Template';
import type { SummarizationPort } from '../../domain/summary/ports/SummarizationPort';
import type { AppError } from '../../shared/errors/AppError';
import {
  GenerateSummariesUseCase,
  type GenerateSummariesOutput,
} from './GenerateSummariesUseCase';

export interface RegenerateSummariesInput {
  readonly meeting: Meeting;
  readonly template: Template;
}

export class RegenerateSummariesUseCase {
  private readonly delegate: GenerateSummariesUseCase;

  constructor(
    summarization: SummarizationPort,
    private readonly repository: MeetingRepository,
  ) {
    this.delegate = new GenerateSummariesUseCase(summarization);
  }

  async execute(input: RegenerateSummariesInput): Promise<GenerateSummariesOutput> {
    const output = await this.delegate.execute({
      meeting: input.meeting,
      kinds: input.template.summaryKinds,
    });
    const saved = await this.repository.save(input.meeting);
    if (!saved.ok) {
      return {
        attempts: output.attempts,
        successCount: output.successCount,
        failureCount: output.failureCount + 1,
      } as GenerateSummariesOutput & { saveError?: AppError };
    }
    return output;
  }
}
