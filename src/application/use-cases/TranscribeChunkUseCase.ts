import type { AudioChunk } from '../../domain/audio/value-objects/AudioChunk';
import type { Meeting } from '../../domain/meeting/entities/Meeting';
import type { TranscriptionPort } from '../../domain/transcription/ports/TranscriptionPort';
import type { AppError } from '../../shared/errors/AppError';
import { type Result } from '../../shared/result/Result';
import type { TranscriptSegment } from '../../domain/transcription/entities/TranscriptSegment';

export interface TranscribeChunkInput {
  readonly meeting: Meeting;
  readonly chunk: AudioChunk;
}

export class TranscribeChunkUseCase {
  constructor(private readonly transcription: TranscriptionPort) {}

  async execute(input: TranscribeChunkInput): Promise<Result<TranscriptSegment, AppError>> {
    const result = await this.transcription.transcribe({
      chunk: input.chunk,
      language: input.meeting.language,
    });
    if (result.ok) {
      input.meeting.appendSegment(result.value);
    }
    return result;
  }
}
