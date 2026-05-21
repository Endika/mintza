import type {
  SummarizationPort,
  SummarizationRequest,
} from '../../domain/summary/ports/SummarizationPort';
import type { Summary } from '../../domain/summary/entities/Summary';
import { AppError } from '../../shared/errors/AppError';
import { err, type Result } from '../../shared/result/Result';

export type ProvidersResolver = () => readonly SummarizationPort[];

const RECOVERABLE_CODES = new Set(['API_KEY_INVALID', 'NETWORK_ERROR']);

export class SummarizationChainAdapter implements SummarizationPort {
  constructor(private readonly resolve: ProvidersResolver) {}

  async summarize(request: SummarizationRequest): Promise<Result<Summary, AppError>> {
    const providers = this.resolve();
    if (providers.length === 0) {
      return err(new AppError('SUMMARIZATION_FAILED', 'No summarization providers configured'));
    }
    let lastError: AppError | null = null;
    for (const provider of providers) {
      const result = await provider.summarize(request);
      if (result.ok) return result;
      lastError = result.error;
      if (!RECOVERABLE_CODES.has(result.error.code)) break;
    }
    return err(lastError ?? new AppError('SUMMARIZATION_FAILED', 'All providers failed'));
  }
}
