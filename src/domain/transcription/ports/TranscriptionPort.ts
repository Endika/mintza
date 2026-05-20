import type { Result } from '../../../shared/result/Result';
import type { AppError } from '../../../shared/errors/AppError';
import type { Language } from '../../language/value-objects/Language';
import type { AudioChunk } from '../../audio/value-objects/AudioChunk';
import type { TranscriptSegment } from '../entities/TranscriptSegment';

export interface TranscriptionRequest {
  readonly chunk: AudioChunk;
  readonly language: Language;
}

export interface TranscriptionPort {
  transcribe(request: TranscriptionRequest): Promise<Result<TranscriptSegment, AppError>>;
}
