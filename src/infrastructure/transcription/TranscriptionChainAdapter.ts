import type {
  TranscriptionPort,
  TranscriptionRequest,
} from '../../domain/transcription/ports/TranscriptionPort';
import type { TranscriptSegment } from '../../domain/transcription/entities/TranscriptSegment';
import { AppError, type ProviderAttempt } from '../../shared/errors/AppError';
import { err, type Result } from '../../shared/result/Result';

export interface NamedTranscriptionPort {
  readonly name: string;
  readonly port: TranscriptionPort;
}

export type TranscriptionProvidersResolver = () => readonly NamedTranscriptionPort[];

const RECOVERABLE_CODES = new Set(['API_KEY_INVALID', 'NETWORK_ERROR', 'CONFIG_INVALID']);

export class TranscriptionChainAdapter implements TranscriptionPort {
  constructor(private readonly resolve: TranscriptionProvidersResolver) {}

  async transcribe(request: TranscriptionRequest): Promise<Result<TranscriptSegment, AppError>> {
    const providers = this.resolve();
    if (providers.length === 0) {
      return err(new AppError('TRANSCRIPTION_FAILED', 'No transcription providers configured'));
    }
    const attempts: ProviderAttempt[] = [];
    for (const { name, port } of providers) {
      const result = await port.transcribe(request);
      if (result.ok) return result;
      const { code, message, reason } = result.error;
      attempts.push({ provider: name, code, message, ...(reason ? { reason } : {}) });
      if (!RECOVERABLE_CODES.has(result.error.code)) break;
    }
    return err(
      new AppError(
        'TRANSCRIPTION_FAILED',
        `All ${attempts.length} transcription providers failed`,
        undefined,
        attempts,
      ),
    );
  }
}
