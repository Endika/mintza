import type {
  ApiKeyProviderName,
  ApiKeyValidator,
  CheckFailureReason,
  ServiceCheck,
  ValidationOutcome,
} from '../../domain/meeting/ports/ApiKeyValidator';
import { AppError } from '../../shared/errors/AppError';
import { err, ok, type Result } from '../../shared/result/Result';
import { httpFailureOf, type HttpClient, type HttpRequest } from '../http/HttpClient';

const TIMEOUT_MS = 6_000;

interface Probe {
  readonly service: string;
  readonly request: HttpRequest;
  readonly google?: true;
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
        const reason = failureReason(response.error, probe.google === true);
        checks.push({ service: probe.service, ok: false, reason });
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
          service: 'Google Gemini',
          request: {
            url: 'https://generativelanguage.googleapis.com/v1beta/models',
            method: 'GET',
            headers: { 'x-goog-api-key': key },
          },
          google: true,
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
          google: true,
        },
      ];
  }
};

const failureReason = (error: AppError, google: boolean): CheckFailureReason => {
  const failure = httpFailureOf(error);
  if (!failure) return error.code === 'NETWORK_ERROR' ? 'network' : 'unknown';
  if (!google) return failure.status === 401 ? 'invalid_key' : 'unknown';
  const markers = googleErrorMarkers(failure.body);
  if (markers.has('API_KEY_SERVICE_BLOCKED')) return 'api_blocked';
  if (markers.has('SERVICE_DISABLED') || markers.has('accessNotConfigured')) return 'api_disabled';
  if (markers.has('API_KEY_INVALID') || markers.has('UNAUTHENTICATED')) return 'invalid_key';
  return 'unknown';
};

interface GoogleErrorBody {
  readonly error?: {
    readonly status?: unknown;
    readonly details?: unknown;
    readonly errors?: unknown;
  };
}

/** The reasons and status Google puts in an error body, e.g. API_KEY_SERVICE_BLOCKED. */
const googleErrorMarkers = (body: string): ReadonlySet<string> => {
  let parsed: GoogleErrorBody | null;
  try {
    parsed = JSON.parse(body) as GoogleErrorBody | null;
  } catch {
    return new Set();
  }
  const error = parsed?.error;
  const entries: unknown[] = [
    error?.status,
    ...reasonsOf(error?.details),
    ...reasonsOf(error?.errors),
  ];
  return new Set(entries.filter((e): e is string => typeof e === 'string'));
};

const reasonsOf = (list: unknown): unknown[] =>
  Array.isArray(list)
    ? list.map((item: unknown) => (item as { readonly reason?: unknown } | null)?.reason)
    : [];
