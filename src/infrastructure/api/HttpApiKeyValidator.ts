import type {
  ApiKeyProviderName,
  ApiKeyValidator,
  ServiceCheck,
  ValidationOutcome,
} from '../../domain/meeting/ports/ApiKeyValidator';
import { AppError } from '../../shared/errors/AppError';
import { err, ok, type Result } from '../../shared/result/Result';
import type { HttpClient, HttpRequest } from '../http/HttpClient';

const TIMEOUT_MS = 6_000;

interface Probe {
  readonly service: string;
  readonly request: HttpRequest;
  readonly hint?: (errorMessage: string) => string;
}

export class HttpApiKeyValidator implements ApiKeyValidator {
  constructor(private readonly http: HttpClient) {}

  async validate(
    provider: ApiKeyProviderName,
    key: string,
  ): Promise<Result<ValidationOutcome, AppError>> {
    const trimmed = key.trim();
    if (trimmed.length === 0) {
      return err(new AppError('API_KEY_INVALID', 'Empty key'));
    }
    const probes = buildProbes(provider, trimmed);
    const checks: ServiceCheck[] = [];
    for (const probe of probes) {
      const response = await this.http.send({
        ...probe.request,
        timeoutMs: TIMEOUT_MS,
        maxRetries: 0,
      });
      if (response.ok) {
        checks.push({ service: probe.service, ok: true });
      } else {
        const message = probe.hint
          ? probe.hint(response.error.message)
          : response.error.message;
        checks.push({ service: probe.service, ok: false, message });
      }
    }
    return ok({ checks });
  }
}

const buildProbes = (provider: ApiKeyProviderName, key: string): readonly Probe[] => {
  switch (provider) {
    case 'openai':
      return [
        {
          service: 'OpenAI (Whisper + GPT)',
          request: {
            url: 'https://api.openai.com/v1/models',
            method: 'GET',
            headers: { Authorization: `Bearer ${key}` },
          },
        },
      ];
    case 'anthropic':
      return [
        {
          service: 'Anthropic Claude',
          request: {
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
          },
        },
      ];
    case 'azure':
      return [
        {
          service: 'Azure',
          request: {
            url: 'https://management.azure.com/subscriptions?api-version=2020-01-01',
            method: 'GET',
            headers: { Authorization: `Bearer ${key}` },
          },
        },
      ];
    case 'google':
      return [
        {
          service: 'Gemini',
          request: {
            url: `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
            method: 'GET',
          },
          hint: () =>
            'Generative Language API not enabled. Visit console.cloud.google.com/apis/library/generativelanguage.googleapis.com',
        },
        {
          service: 'Speech-to-Text',
          request: {
            url: `https://speech.googleapis.com/v1/operations?key=${encodeURIComponent(key)}`,
            method: 'GET',
          },
          hint: () =>
            'Cloud Speech-to-Text API not enabled. Visit console.cloud.google.com/apis/library/speech.googleapis.com',
        },
      ];
  }
};
