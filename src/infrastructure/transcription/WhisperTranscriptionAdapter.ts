import type { AudioChunk } from '../../domain/audio/value-objects/AudioChunk';
import type {
  TranscriptionPort,
  TranscriptionRequest,
} from '../../domain/transcription/ports/TranscriptionPort';
import { TranscriptSegment } from '../../domain/transcription/entities/TranscriptSegment';
import { TranscriptText } from '../../domain/transcription/value-objects/TranscriptText';
import type { AppError } from '../../shared/errors/AppError';
import { ok, type Result } from '../../shared/result/Result';
import type { WhisperClient } from './WhisperClient';

export class WhisperTranscriptionAdapter implements TranscriptionPort {
  constructor(private readonly client: WhisperClient) {}

  async transcribe(request: TranscriptionRequest): Promise<Result<TranscriptSegment, AppError>> {
    const result = await this.client.transcribe(request.chunk.blob, request.language);
    if (!result.ok) return result;
    return ok(toSegment(request.chunk, result.value.text));
  }
}

const toSegment = (chunk: AudioChunk, text: string): TranscriptSegment =>
  new TranscriptSegment({
    id: crypto.randomUUID(),
    startMs: chunk.startMs,
    endMs: chunk.endMs,
    text: TranscriptText.of(text),
    provider: 'whisper',
  });
