import { afterEach, describe, expect, it } from 'vitest';
import type {
  ApiKeyProviderName,
  ServiceCheck,
} from '../../src/domain/meeting/ports/ApiKeyValidator';
import { HttpApiKeyValidator } from '../../src/infrastructure/api/HttpApiKeyValidator';
import { HttpClient } from '../../src/infrastructure/http/HttpClient';

const realFetch = globalThis.fetch;

const googleError = (code: number, status: string, reason?: string, legacy?: string): string =>
  JSON.stringify({
    error: {
      code,
      message: 'canned',
      status,
      ...(legacy ? { errors: [{ reason: legacy, domain: 'usageLimits' }] } : {}),
      details: reason
        ? [
            {
              '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
              reason,
              domain: 'googleapis.com',
            },
          ]
        : [],
    },
  });

const respondWith = (status: number, body: string): void => {
  globalThis.fetch = () =>
    Promise.resolve(
      new Response(body, { status, headers: { 'content-type': 'application/json' } }),
    );
};

const failWithNetwork = (): void => {
  globalThis.fetch = () => Promise.reject(new TypeError('Failed to fetch'));
};

const onlyCheck = async (provider: ApiKeyProviderName): Promise<ServiceCheck> => {
  const result = await new HttpApiKeyValidator(new HttpClient()).validate(provider, 'AIza-key');
  if (!result.ok) throw new Error('validation should produce checks');
  expect(result.value.checks).toHaveLength(1);
  return result.value.checks[0]!;
};

describe('a failed key test says why', () => {
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('reads a Google 400 API_KEY_INVALID as an invalid key', async () => {
    respondWith(400, googleError(400, 'INVALID_ARGUMENT', 'API_KEY_INVALID'));
    expect(await onlyCheck('google')).toEqual({
      service: 'Google Gemini',
      ok: false,
      reason: 'invalid_key',
    });
  });

  it('reads a 403 API_KEY_SERVICE_BLOCKED as an API the key may not call', async () => {
    respondWith(403, googleError(403, 'PERMISSION_DENIED', 'API_KEY_SERVICE_BLOCKED'));
    expect((await onlyCheck('google')).reason).toBe('api_blocked');
  });

  it('reads a 403 SERVICE_DISABLED as an API not enabled in the project', async () => {
    respondWith(403, googleError(403, 'PERMISSION_DENIED', 'SERVICE_DISABLED'));
    expect(await onlyCheck('googleSpeech')).toEqual({
      service: 'Google Speech',
      ok: false,
      reason: 'api_disabled',
    });
  });

  it('reads the legacy accessNotConfigured reason as an API not enabled', async () => {
    respondWith(403, googleError(403, 'PERMISSION_DENIED', undefined, 'accessNotConfigured'));
    expect((await onlyCheck('googleSpeech')).reason).toBe('api_disabled');
  });

  it('reads a 401 from another provider as an invalid key', async () => {
    respondWith(401, JSON.stringify({ error: { message: 'Incorrect API key provided' } }));
    expect(await onlyCheck('openai')).toEqual({
      service: 'OpenAI',
      ok: false,
      reason: 'invalid_key',
    });
  });

  it('reads an unreachable service as a network problem', async () => {
    failWithNetwork();
    expect((await onlyCheck('anthropic')).reason).toBe('network');
  });

  it('falls back to unknown for a Google error it cannot place', async () => {
    respondWith(403, 'not json');
    expect((await onlyCheck('google')).reason).toBe('unknown');
  });

  it('keeps the status and body of a rejected request reachable for other callers', async () => {
    respondWith(403, googleError(403, 'PERMISSION_DENIED', 'API_KEY_SERVICE_BLOCKED'));
    const result = await new HttpClient().send({
      url: 'https://speech.googleapis.com/v1/operations',
      method: 'GET',
      maxRetries: 0,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('API_KEY_INVALID');
    expect(result.error.cause).toEqual({
      status: 403,
      body: googleError(403, 'PERMISSION_DENIED', 'API_KEY_SERVICE_BLOCKED'),
    });
  });
});
