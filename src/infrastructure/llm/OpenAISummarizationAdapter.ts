import { Summary } from '../../domain/summary/entities/Summary';
import type {
  SummarizationPort,
  SummarizationRequest,
} from '../../domain/summary/ports/SummarizationPort';
import { SummaryPromptBuilder } from '../../domain/summary/services/SummaryPromptBuilder';
import { TokenCount } from '../../domain/tokens/value-objects/TokenCount';
import type { AppError } from '../../shared/errors/AppError';
import { ok, type Result } from '../../shared/result/Result';
import type { OpenAIClient, OpenAIReasoningEffort } from './OpenAIClient';

export interface OpenAISummarizationOptions {
  readonly model?: string;
  readonly reasoningEffort?: OpenAIReasoningEffort;
}

const DEFAULT_MODEL = 'gpt-6-luna';
// Reasoning tokens count against the completion limit.
const REASONING_MAX_TOKENS = 4096;

export class OpenAISummarizationAdapter implements SummarizationPort {
  private readonly model: string;
  private readonly reasoningEffort: OpenAIReasoningEffort;
  private readonly prompts: SummaryPromptBuilder;

  constructor(
    private readonly client: OpenAIClient,
    options: OpenAISummarizationOptions = {},
  ) {
    this.model = options.model ?? DEFAULT_MODEL;
    this.reasoningEffort = options.reasoningEffort ?? 'none';
    this.prompts = new SummaryPromptBuilder();
  }

  async summarize(request: SummarizationRequest): Promise<Result<Summary, AppError>> {
    const prompt = this.prompts.build(request);
    const response = await this.client.chat({
      model: this.model,
      system: prompt.system,
      user: prompt.user,
      reasoningEffort: this.reasoningEffort,
      ...(this.reasoningEffort === 'none' ? {} : { maxTokens: REASONING_MAX_TOKENS }),
    });
    if (!response.ok) return response;
    const summary = new Summary({
      kind: request.kind,
      content: response.value.content.trim(),
      tokensIn: TokenCount.of(response.value.promptTokens),
      tokensOut: TokenCount.of(response.value.completionTokens),
      provider: 'openai',
      model: this.model,
      generatedAt: new Date(),
    });
    return ok(summary);
  }
}
