import type { AppError } from '../../../shared/errors/AppError';
import type { Result } from '../../../shared/result/Result';
import type { Language } from '../../language/value-objects/Language';
import type { Template } from '../../meeting/value-objects/Template';
import type { TranscriptText } from '../../transcription/value-objects/TranscriptText';
import type { MindMap } from '../entities/MindMap';

export interface MindMapRequest {
  readonly transcript: TranscriptText;
  readonly template: Template;
  readonly language: Language;
}

export interface MindMapPort {
  generate(request: MindMapRequest): Promise<Result<MindMap, AppError>>;
}
