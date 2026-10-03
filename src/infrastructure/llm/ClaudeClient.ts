import { AppError } from '../../shared/errors/AppError';
import { err, ok, type Result } from '../../shared/result/Result';
import type { HttpClient } from '../http/HttpClient';

const CLAUDE_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

export interface ClaudeChatRequest {
  readonly model: string;
  readonly system: string;
  readonly user: string;
  readonly effort?: 'low' | 'medium' | 'high';
  readonly maxTokens?: number;
}

export interface ClaudeChatResponse {
  readonly content: string;
  readonly promptTokens: number;
  readonly completionTokens: number;
}

interface ClaudeBody {
  readonly stop_reason?: string;
  readonly content: ReadonlyArray<{ readonly type: string; readonly text?: string }>;
  readonly usage?: {
    readonly input_tokens: number;
    readonly output_tokens: number;
  };
}

export class ClaudeClient {
  constructor(
    private readonly http: HttpClient,
    private readonly apiKeyProvider: () => string | undefined,
  ) {}

  async chat(request: ClaudeChatRequest): Promise<Result<ClaudeChatResponse, AppError>> {
    const apiKey = this.apiKeyProvider();
    if (!apiKey) {
      return err(
        new AppError(
          'API_KEY_INVALID',
          'Claude: missing Anthropic API key',
          undefined,
          [],
          'missing_key',
        ),
      );
    }
    const body = JSON.stringify({
      model: request.model,
      max_tokens: request.maxTokens ?? 4096,
      ...(request.effort ? { output_config: { effort: request.effort } } : {}),
      fallbacks: 'default',
      system: request.system,
      messages: [{ role: 'user', content: request.user }],
    });
    const response = await this.http.send({
      url: CLAUDE_URL,
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'anthropic-dangerous-direct-browser-access': 'true',
        'anthropic-beta': FALLBACK_BETA,
        'content-type': 'application/json',
      },
      body,
    });
    if (!response.ok) return response;
    try {
      const parsed = await response.value.json<ClaudeBody>();
      if (parsed.stop_reason === 'refusal') {
        return err(
          new AppError('SUMMARIZATION_FAILED', 'Claude: refused', undefined, [], 'refused'),
        );
      }
      if (parsed.stop_reason === 'max_tokens') {
        return err(
          new AppError(
            'SUMMARIZATION_FAILED',
            'Claude: reply cut off at max_tokens',
            undefined,
            [],
            'truncated',
          ),
        );
      }
      const text = parsed.content
        .filter((c) => c.type === 'text')
        .map((c) => c.text ?? '')
        .join('');
      if (text.length === 0) {
        return err(
          new AppError(
            'SUMMARIZATION_FAILED',
            'Claude: empty response',
            undefined,
            [],
            'bad_response',
          ),
        );
      }
      return ok({
        content: text,
        promptTokens: parsed.usage?.input_tokens ?? 0,
        completionTokens: parsed.usage?.output_tokens ?? 0,
      });
    } catch (cause) {
      return err(
        new AppError(
          'SUMMARIZATION_FAILED',
          'Claude: invalid response body',
          cause,
          [],
          'bad_response',
        ),
      );
    }
  }
}
