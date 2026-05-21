import type {
  SummarizationPort,
  SummarizationRequest,
} from '../../domain/summary/ports/SummarizationPort';
import type { Summary } from '../../domain/summary/entities/Summary';
import { AppError, type ProviderAttempt } from '../../shared/errors/AppError';
import { err, type Result } from '../../shared/result/Result';

export interface NamedSummarizationPort {
  readonly name: string;
  readonly port: SummarizationPort;
}

export type ProvidersResolver = () => readonly NamedSummarizationPort[];

const RECOVERABLE_CODES = new Set(['API_KEY_INVALID', 'NETWORK_ERROR', 'CONFIG_INVALID']);

export class SummarizationChainAdapter implements SummarizationPort {
  constructor(private readonly resolve: ProvidersResolver) {}

  async summarize(request: SummarizationRequest): Promise<Result<Summary, AppError>> {
    const providers = this.resolve();
    if (providers.length === 0) {
      return err(new AppError('SUMMARIZATION_FAILED', 'No summarization providers configured'));
    }
    const attempts: ProviderAttempt[] = [];
    for (const { name, port } of providers) {
      const result = await port.summarize(request);
      if (result.ok) return result;
      attempts.push({ provider: name, code: result.error.code, message: result.error.message });
      if (!RECOVERABLE_CODES.has(result.error.code)) break;
    }
    return err(
      new AppError(
        'SUMMARIZATION_FAILED',
        `All ${attempts.length} summarization providers failed`,
        undefined,
        attempts,
      ),
    );
  }
}
