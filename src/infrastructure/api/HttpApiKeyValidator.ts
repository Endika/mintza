import type {
  ApiKeyProviderName,
  ApiKeyValidator,
} from '../../domain/meeting/ports/ApiKeyValidator';
import { AppError, type ProviderAttempt } from '../../shared/errors/AppError';
import { err, ok, type Result } from '../../shared/result/Result';
import type { HttpClient, HttpRequest } from '../http/HttpClient';

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
    if (provider === 'google') {
      return this.validateGoogle(trimmed);
    }
    const request = buildSingleRequest(provider, trimmed);
    const response = await this.http.send({
      ...request,
      timeoutMs: TIMEOUT_MS,
      maxRetries: 0,
    });
    if (!response.ok) return err(response.error);
    return ok(undefined);
  }

  private async validateGoogle(key: string): Promise<Result<void, AppError>> {
    const checks: Array<{ name: string; req: HttpRequest }> = [
      {
        name: 'Gemini',
        req: {
          url: `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
          method: 'GET',
        },
      },
      {
        name: 'Speech-to-Text',
        req: {
          url: `https://speech.googleapis.com/v1/operations?key=${encodeURIComponent(key)}`,
          method: 'GET',
        },
      },
    ];
    const attempts: ProviderAttempt[] = [];
    for (const { name, req } of checks) {
      const response = await this.http.send({ ...req, timeoutMs: TIMEOUT_MS, maxRetries: 0 });
      if (!response.ok) {
        const hint =
          name === 'Speech-to-Text' && response.error.code === 'API_KEY_INVALID'
            ? `${name}: not enabled. Visit console.cloud.google.com/apis/library/speech.googleapis.com`
            : `${name}: ${response.error.message}`;
        attempts.push({ provider: name, code: response.error.code, message: hint });
      }
    }
    if (attempts.length === 0) return ok(undefined);
    return err(
      new AppError(
        'API_KEY_INVALID',
        `Google key failed ${attempts.length}/${checks.length} services`,
        undefined,
        attempts,
      ),
    );
  }
}

const buildSingleRequest = (provider: ApiKeyProviderName, key: string): HttpRequest => {
  switch (provider) {
    case 'openai':
      return {
        url: 'https://api.openai.com/v1/models',
        method: 'GET',
        headers: { Authorization: `Bearer ${key}` },
      };
    case 'anthropic':
      return {
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
      };
    case 'azure':
      return {
        url: 'https://management.azure.com/subscriptions?api-version=2020-01-01',
        method: 'GET',
        headers: { Authorization: `Bearer ${key}` },
      };
    case 'google':
      throw new Error('Google validation uses multi-step validateGoogle');
  }
};
