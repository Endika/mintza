import type {
  TranscriptionPort,
  TranscriptionRequest,
} from '../../domain/transcription/ports/TranscriptionPort';
import type { TranscriptSegment } from '../../domain/transcription/entities/TranscriptSegment';
import { AppError } from '../../shared/errors/AppError';
import { err, type Result } from '../../shared/result/Result';

export type TranscriptionProvidersResolver = () => readonly TranscriptionPort[];

const RECOVERABLE_CODES = new Set(['API_KEY_INVALID', 'NETWORK_ERROR']);

export class TranscriptionChainAdapter implements TranscriptionPort {
  constructor(private readonly resolve: TranscriptionProvidersResolver) {}

  async transcribe(
    request: TranscriptionRequest,
  ): Promise<Result<TranscriptSegment, AppError>> {
    const providers = this.resolve();
    if (providers.length === 0) {
      return err(new AppError('TRANSCRIPTION_FAILED', 'No transcription providers configured'));
    }
    let lastError: AppError | null = null;
    for (const provider of providers) {
      const result = await provider.transcribe(request);
      if (result.ok) return result;
      lastError = result.error;
      if (!RECOVERABLE_CODES.has(result.error.code)) break;
    }
    return err(lastError ?? new AppError('TRANSCRIPTION_FAILED', 'All providers failed'));
  }
}
