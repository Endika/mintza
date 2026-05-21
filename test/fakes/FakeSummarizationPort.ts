import type {
  SummarizationPort,
  SummarizationRequest,
} from '../../src/domain/summary/ports/SummarizationPort';
import { Summary } from '../../src/domain/summary/entities/Summary';
import type { LLMProviderName } from '../../src/domain/summary/value-objects/LLMProvider';
import { TokenCount } from '../../src/domain/tokens/value-objects/TokenCount';
import { AppError, type AppErrorCode } from '../../src/shared/errors/AppError';
import { err, ok, type Result } from '../../src/shared/result/Result';

export class FakeSummarizationPort implements SummarizationPort {
  readonly calls: SummarizationRequest[] = [];

  constructor(
    private readonly behavior:
      | { kind: 'success'; content: string; provider?: LLMProviderName }
      | { kind: 'failure'; code: AppErrorCode; message: string },
  ) {}

  async summarize(request: SummarizationRequest): Promise<Result<Summary, AppError>> {
    this.calls.push(request);
    if (this.behavior.kind === 'failure') {
      return Promise.resolve(err(new AppError(this.behavior.code, this.behavior.message)));
    }
    const summary = new Summary({
      kind: request.kind,
      content: this.behavior.content,
      tokensIn: TokenCount.of(10),
      tokensOut: TokenCount.of(5),
      provider: this.behavior.provider ?? 'openai',
      generatedAt: new Date('2026-05-21T10:00:00Z'),
    });
    return Promise.resolve(ok(summary));
  }
}
