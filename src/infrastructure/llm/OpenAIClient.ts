import { AppError } from '../../shared/errors/AppError';
import { err, ok, type Result } from '../../shared/result/Result';
import type { HttpClient } from '../http/HttpClient';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

export interface OpenAIChatRequest {
  readonly model: string;
  readonly system: string;
  readonly user: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
}

export interface OpenAIChatResponse {
  readonly content: string;
  readonly promptTokens: number;
  readonly completionTokens: number;
}

interface ChatBody {
  readonly choices: ReadonlyArray<{ readonly message: { readonly content?: string } }>;
  readonly usage?: {
    readonly prompt_tokens: number;
    readonly completion_tokens: number;
  };
}

export class OpenAIClient {
  constructor(
    private readonly http: HttpClient,
    private readonly apiKeyProvider: () => string | undefined,
  ) {}

  async chat(request: OpenAIChatRequest): Promise<Result<OpenAIChatResponse, AppError>> {
    const apiKey = this.apiKeyProvider();
    if (!apiKey) {
      return err(new AppError('API_KEY_INVALID', 'OpenAI: missing OpenAI API key in Settings'));
    }
    const body = JSON.stringify({
      model: request.model,
      temperature: request.temperature ?? 0.2,
      max_tokens: request.maxTokens ?? 1024,
      messages: [
        { role: 'system', content: request.system },
        { role: 'user', content: request.user },
      ],
    });
    const response = await this.http.send({
      url: OPENAI_URL,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body,
    });
    if (!response.ok) return response;
    try {
      const parsed = await response.value.json<ChatBody>();
      const content = parsed.choices[0]?.message.content;
      if (typeof content !== 'string' || content.length === 0) {
        return err(new AppError('SUMMARIZATION_FAILED', 'OpenAI: empty response'));
      }
      return ok({
        content,
        promptTokens: parsed.usage?.prompt_tokens ?? 0,
        completionTokens: parsed.usage?.completion_tokens ?? 0,
      });
    } catch (cause) {
      return err(new AppError('SUMMARIZATION_FAILED', 'OpenAI: invalid response body', cause));
    }
  }
}
