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
/** Another provider may well answer what this one declined or couldn't fit. */
const RECOVERABLE_REASONS = new Set(['refused', 'truncated']);

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
      const { code, message, reason } = result.error;
      attempts.push({ provider: name, code, message, ...(reason ? { reason } : {}) });
      if (!RECOVERABLE_CODES.has(code) && !RECOVERABLE_REASONS.has(reason ?? '')) break;
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
