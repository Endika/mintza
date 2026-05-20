import type { Meeting } from '../../domain/meeting/entities/Meeting';
import type { SummarizationPort } from '../../domain/summary/ports/SummarizationPort';
import type { SummaryKind } from '../../domain/summary/value-objects/SummaryKind';
import type { Summary } from '../../domain/summary/entities/Summary';
import type { AppError } from '../../shared/errors/AppError';

export interface GenerateSummariesInput {
  readonly meeting: Meeting;
  readonly kinds: readonly SummaryKind[];
}

export interface SummaryAttempt {
  readonly kind: SummaryKind;
  readonly result: { ok: true; summary: Summary } | { ok: false; error: AppError };
}

export interface GenerateSummariesOutput {
  readonly attempts: readonly SummaryAttempt[];
  readonly successCount: number;
  readonly failureCount: number;
}

export class GenerateSummariesUseCase {
  constructor(private readonly summarization: SummarizationPort) {}

  async execute(input: GenerateSummariesInput): Promise<GenerateSummariesOutput> {
    const transcript = input.meeting.fullText();
    const requests = input.kinds.map(async (kind): Promise<SummaryAttempt> => {
      const result = await this.summarization.summarize({
        kind,
        transcript,
        template: input.meeting.template,
        language: input.meeting.language,
      });
      if (result.ok) {
        input.meeting.setSummary(result.value);
        return { kind, result: { ok: true, summary: result.value } };
      }
      return { kind, result: { ok: false, error: result.error } };
    });
    const attempts = await Promise.all(requests);
    return {
      attempts,
      successCount: attempts.filter((a) => a.result.ok).length,
      failureCount: attempts.filter((a) => !a.result.ok).length,
    };
  }
}
