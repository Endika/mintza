import type {
  ApiKeyProviderName,
  ApiKeyValidator,
} from '../../domain/meeting/ports/ApiKeyValidator';
import { AppError } from '../../shared/errors/AppError';
import { err, ok, type Result } from '../../shared/result/Result';
import type { HttpClient } from '../http/HttpClient';

const TIMEOUT_MS = 6_000;

export class HttpApiKeyValidator implements ApiKeyValidator {
  constructor(private readonly http: HttpClient) {}

  async validate(
    provider: ApiKeyProviderName,
    key: string,
  ): Promise<Result<void, AppError>> {
    const trimmed = key.trim();
    if (trimmed.length === 0) {
      return err(new AppError('API_KEY_INVALID', 'Empty key'));
    }
    const request = REQUESTS[provider](trimmed);
    const response = await this.http.send({
      ...request,
      timeoutMs: TIMEOUT_MS,
      maxRetries: 0,
    });
    if (!response.ok) return err(response.error);
    return ok(undefined);
  }
}

const REQUESTS: Record<
  ApiKeyProviderName,
  (key: string) => Parameters<HttpClient['send']>[0]
> = {
  openai: (key) => ({
    url: 'https://api.openai.com/v1/models',
    method: 'GET',
    headers: { Authorization: `Bearer ${key}` },
  }),
  anthropic: (key) => ({
    url: 'https://api.anthropic.com/v1/messages',
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'ping' }],
    }),
  }),
  google: (key) => ({
    url: `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
    method: 'GET',
  }),
  azure: (key) => ({
    url: 'https://management.azure.com/subscriptions?api-version=2020-01-01',
    method: 'GET',
    headers: { Authorization: `Bearer ${key}` },
  }),
};
