import type {
  ApiKeyProviderName,
  ApiKeyValidator,
  CheckFailureReason,
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
}

export class HttpApiKeyValidator implements ApiKeyValidator {
  constructor(private readonly http: HttpClient) {}

  async validate(
    provider: ApiKeyProviderName,
    key: string,
  ): Promise<Result<ValidationOutcome, AppError>> {
    const trimmed = key.trim();
    if (trimmed.length === 0) {
      return err(new AppError('API_KEY_INVALID', 'Empty key', undefined, [], 'missing_key'));
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
        checks.push({ service: probe.service, ok: false, reason: checkReason(response.error) });
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
          service: 'OpenAI',
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
          service: 'Anthropic',
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
              model: 'claude-sonnet-5-5',
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
          service: 'Google Gemini',
          request: {
            url: 'https://generativelanguage.googleapis.com/v1beta/models',
            method: 'GET',
            headers: { 'x-goog-api-key': key },
          },
        },
      ];
    case 'googleSpeech':
      return [
        {
          service: 'Google Speech',
          request: {
            url: 'https://speech.googleapis.com/v1/operations',
            method: 'GET',
            headers: { 'x-goog-api-key': key },
          },
        },
      ];
  }
};

const CHECK_REASONS: ReadonlySet<CheckFailureReason> = new Set([
  'invalid_key',
  'api_blocked',
  'key_restricted',
  'api_disabled',
  'billing_disabled',
  'network',
  'unknown',
]);

const checkReason = (error: AppError): CheckFailureReason =>
  CHECK_REASONS.has(error.reason as CheckFailureReason)
    ? (error.reason as CheckFailureReason)
    : 'unknown';
