import type {
  TranscriptionPort,
  TranscriptionRequest,
} from '../../src/domain/transcription/ports/TranscriptionPort';
import { TranscriptSegment } from '../../src/domain/transcription/entities/TranscriptSegment';
import { TranscriptText } from '../../src/domain/transcription/value-objects/TranscriptText';
import type { TranscriptionProviderName } from '../../src/domain/transcription/value-objects/TranscriptionProvider';
import { AppError, type AppErrorCode } from '../../src/shared/errors/AppError';
import { err, ok, type Result } from '../../src/shared/result/Result';

export class FakeTranscriptionPort implements TranscriptionPort {
  readonly calls: TranscriptionRequest[] = [];

  constructor(
    private readonly behavior:
      | { kind: 'success'; text: string; provider: TranscriptionProviderName }
      | { kind: 'failure'; code: AppErrorCode; message: string },
  ) {}

  async transcribe(request: TranscriptionRequest): Promise<Result<TranscriptSegment, AppError>> {
    this.calls.push(request);
    if (this.behavior.kind === 'failure') {
      return Promise.resolve(err(new AppError(this.behavior.code, this.behavior.message)));
    }
    const segment = new TranscriptSegment({
      id: 'fake',
      startMs: request.chunk.startMs,
      endMs: request.chunk.endMs,
      text: TranscriptText.of(this.behavior.text),
      provider: this.behavior.provider,
    });
    return Promise.resolve(ok(segment));
  }
}
