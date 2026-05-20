import type { Result } from '../../../shared/result/Result';
import type { AppError } from '../../../shared/errors/AppError';
import type { Language } from '../../language/value-objects/Language';
import type { Template } from '../../meeting/value-objects/Template';
import type { TranscriptText } from '../../transcription/value-objects/TranscriptText';
import type { Summary } from '../entities/Summary';
import type { SummaryKind } from '../value-objects/SummaryKind';

export interface SummarizationRequest {
  readonly kind: SummaryKind;
  readonly transcript: TranscriptText;
  readonly template: Template;
  readonly language: Language;
}

export interface SummarizationPort {
  summarize(request: SummarizationRequest): Promise<Result<Summary, AppError>>;
}
