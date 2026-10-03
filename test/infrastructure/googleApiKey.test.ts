import { describe, expect, it } from 'vitest';
import { Language } from '../../src/domain/language/value-objects/Language';
import { HttpApiKeyValidator } from '../../src/infrastructure/api/HttpApiKeyValidator';
import {
  HttpClient,
  type HttpRequest,
  type HttpResponse,
} from '../../src/infrastructure/http/HttpClient';
import { GeminiClient } from '../../src/infrastructure/llm/GeminiClient';
import { GoogleSpeechClient } from '../../src/infrastructure/transcription/GoogleSpeechClient';
import type { AppError } from '../../src/shared/errors/AppError';
import { ok, type Result } from '../../src/shared/result/Result';

class RecordingHttp extends HttpClient {
  readonly requests: HttpRequest[] = [];
  constructor(private readonly body: unknown = {}) {
    super();
  }
  override send(request: HttpRequest): Promise<Result<HttpResponse, AppError>> {
    this.requests.push(request);
    const body = this.body;
    return Promise.resolve(
      ok({
        status: 200,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify(body)),
        json: <T>() => Promise.resolve(body as T),
        blob: () => Promise.resolve(new Blob()),
      }),
    );
  }
}

const KEY = 'AIza-secret';

const expectKeyInHeaderOnly = (requests: readonly HttpRequest[]): void => {
  expect(requests.length).toBeGreaterThan(0);
  for (const request of requests) {
    expect(request.url).not.toContain(KEY);
    expect(new URL(request.url).searchParams.has('key')).toBe(false);
    expect(request.headers?.['x-goog-api-key']).toBe(KEY);
  }
};

describe('Google API keys travel in a header, never in the URL', () => {
  it('validates both Google services with the key in x-goog-api-key', async () => {
    const http = new RecordingHttp();
    await new HttpApiKeyValidator(http).validate('google', KEY);
    expect(http.requests).toHaveLength(2);
    expectKeyInHeaderOnly(http.requests);
  });

  it('summarizes with Gemini using the header', async () => {
    const http = new RecordingHttp({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] });
    await new GeminiClient(http, () => KEY).chat({
      model: 'gemini-2.0-flash',
      system: 'sys',
      user: 'hi',
    });
    expectKeyInHeaderOnly(http.requests);
  });

  it('transcribes with Google Speech using the header', async () => {
    const http = new RecordingHttp({ results: [{ alternatives: [{ transcript: 'hola' }] }] });
    await new GoogleSpeechClient(http, () => KEY).recognize(
      new Blob(['audio'], { type: 'audio/webm' }),
      Language.of('es'),
    );
    expectKeyInHeaderOnly(http.requests);
  });
});
