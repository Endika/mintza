import type { AudioChunk } from '../../domain/audio/value-objects/AudioChunk';
import type { Meeting } from '../../domain/meeting/entities/Meeting';
import type { TranscriptionPort } from '../../domain/transcription/ports/TranscriptionPort';
import type { AppError } from '../../shared/errors/AppError';
import { ok, type Result } from '../../shared/result/Result';
import { TranscriptSegment } from '../../domain/transcription/entities/TranscriptSegment';
import { TranscriptText } from '../../domain/transcription/value-objects/TranscriptText';
import { HallucinationFilter } from '../../domain/transcription/services/HallucinationFilter';

const SILENCE_PEAK_THRESHOLD = 0.012;

export interface TranscribeChunkInput {
  readonly meeting: Meeting;
  readonly chunk: AudioChunk;
}

export class TranscribeChunkUseCase {
  constructor(
    private readonly transcription: TranscriptionPort,
    private readonly hallucinations: HallucinationFilter = new HallucinationFilter(),
  ) {}

  async execute(input: TranscribeChunkInput): Promise<Result<TranscriptSegment | null, AppError>> {
    const peak = input.chunk.peakLevel;
    if (peak !== undefined && peak < SILENCE_PEAK_THRESHOLD) {
      return ok(null); // silent: skip, never call the API
    }
    const result = await this.transcription.transcribe({
      chunk: input.chunk,
      language: input.meeting.language,
    });
    if (!result.ok) return result;
    const cleaned = this.hallucinations.clean(result.value.text.value);
    if (cleaned.length === 0) return ok(null); // pure hallucination / no speech
    const segment =
      cleaned === result.value.text.value
        ? result.value
        : new TranscriptSegment({
            id: result.value.id,
            startMs: result.value.startMs,
            endMs: result.value.endMs,
            text: TranscriptText.of(cleaned),
            provider: result.value.provider,
          });
    input.meeting.appendSegment(segment);
    return ok(segment);
  }
}
