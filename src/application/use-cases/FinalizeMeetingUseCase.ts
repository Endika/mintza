import type { Meeting } from '../../domain/meeting/entities/Meeting';
import type { MeetingRepository } from '../../domain/meeting/ports/MeetingRepository';
import type { MindMap } from '../../domain/mindmap/entities/MindMap';
import type { MindMapPort } from '../../domain/mindmap/ports/MindMapPort';
import type { Summary } from '../../domain/summary/entities/Summary';
import type { SummarizationPort } from '../../domain/summary/ports/SummarizationPort';
import type { SummaryKind } from '../../domain/summary/value-objects/SummaryKind';
import type { SentimentScoreParser } from '../../domain/temperature/services/SentimentScoreParser';
import type { AppError } from '../../shared/errors/AppError';

export interface FinalizeMeetingInput {
  readonly meeting: Meeting;
  readonly kinds: readonly SummaryKind[];
}

export interface SummaryAttempt {
  readonly kind: SummaryKind;
  readonly result: { ok: true; summary: Summary } | { ok: false; error: AppError };
}

export interface FinalizeMeetingOutput {
  readonly summaryAttempts: readonly SummaryAttempt[];
  readonly summarySuccessCount: number;
  readonly summaryFailureCount: number;
  readonly mindMap?: MindMap;
  readonly mindMapError?: AppError;
  readonly saveError?: AppError;
}

export class FinalizeMeetingUseCase {
  constructor(
    private readonly summarization: SummarizationPort,
    private readonly mindMap: MindMapPort,
    private readonly repository: MeetingRepository,
    private readonly sentimentParser: SentimentScoreParser,
  ) {}

  async execute(input: FinalizeMeetingInput): Promise<FinalizeMeetingOutput> {
    const transcript = input.meeting.fullText();
    const summaryRequests = input.kinds.map(async (kind): Promise<SummaryAttempt> => {
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
    const summaryAttempts = await Promise.all(summaryRequests);
    const summarySuccessCount = summaryAttempts.filter((a) => a.result.ok).length;
    const summaryFailureCount = summaryAttempts.filter((a) => !a.result.ok).length;

    const sentiment = input.meeting.summaries.get('sentiment');
    if (sentiment) {
      const score = this.sentimentParser.parse(sentiment.content);
      if (score) input.meeting.setTemperature(score);
    }

    const savedAfterSummaries = await this.repository.save(input.meeting);
    if (!savedAfterSummaries.ok) {
      return {
        summaryAttempts,
        summarySuccessCount,
        summaryFailureCount,
        saveError: savedAfterSummaries.error,
      };
    }

    const mindMapResult = await this.mindMap.generate({
      transcript,
      template: input.meeting.template,
      language: input.meeting.language,
    });
    if (!mindMapResult.ok) {
      return {
        summaryAttempts,
        summarySuccessCount,
        summaryFailureCount,
        mindMapError: mindMapResult.error,
      };
    }
    input.meeting.setMindMap(mindMapResult.value);

    const savedAfterMindMap = await this.repository.save(input.meeting);
    if (!savedAfterMindMap.ok) {
      return {
        summaryAttempts,
        summarySuccessCount,
        summaryFailureCount,
        mindMap: mindMapResult.value,
        saveError: savedAfterMindMap.error,
      };
    }

    return {
      summaryAttempts,
      summarySuccessCount,
      summaryFailureCount,
      mindMap: mindMapResult.value,
    };
  }
}
