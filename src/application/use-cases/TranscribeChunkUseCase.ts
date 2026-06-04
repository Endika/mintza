import type { AudioChunk } from '../../domain/audio/value-objects/AudioChunk';
import type { Meeting } from '../../domain/meeting/entities/Meeting';
import type { TranscriptionPort } from '../../domain/transcription/ports/TranscriptionPort';
import type { AppError } from '../../shared/errors/AppError';
import { ok, type Result } from '../../shared/result/Result';
import type { TranscriptSegment } from '../../domain/transcription/entities/TranscriptSegment';

const SILENCE_PEAK_THRESHOLD = 0.012;

export interface TranscribeChunkInput {
  readonly meeting: Meeting;
  readonly chunk: AudioChunk;
}

export class TranscribeChunkUseCase {
  constructor(private readonly transcription: TranscriptionPort) {}

  async execute(
    input: TranscribeChunkInput,
  ): Promise<Result<TranscriptSegment | null, AppError>> {
    const peak = input.chunk.peakLevel;
    if (peak !== undefined && peak < SILENCE_PEAK_THRESHOLD) {
      return ok(null); // silent: skip, never call the API
    }
    const result = await this.transcription.transcribe({
      chunk: input.chunk,
      language: input.meeting.language,
    });
    if (!result.ok) return result;
    input.meeting.appendSegment(result.value);
    return ok(result.value);
  }
}
