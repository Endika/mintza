import { describe, expect, it } from 'vitest';
import { AudioChunk } from '../../../src/domain/audio/value-objects/AudioChunk';
import { Language } from '../../../src/domain/language/value-objects/Language';
import {
  HttpClient,
  type HttpRequest,
  type HttpResponse,
} from '../../../src/infrastructure/http/HttpClient';
import { OpenAITranscriptionAdapter } from '../../../src/infrastructure/transcription/OpenAITranscriptionAdapter';
import { OpenAITranscriptionClient } from '../../../src/infrastructure/transcription/OpenAITranscriptionClient';
import type { AppError } from '../../../src/shared/errors/AppError';
import { ok, type Result } from '../../../src/shared/result/Result';

class CannedHttp extends HttpClient {
  readonly sent: HttpRequest[] = [];
  constructor(private readonly json: () => Promise<unknown>) {
    super();
  }

  override send(request: HttpRequest): Promise<Result<HttpResponse, AppError>> {
    this.sent.push(request);
    return Promise.resolve(
      ok({
        status: 200,
        headers: new Headers(),
        text: () => Promise.resolve(''),
        json: <T>() => this.json() as Promise<T>,
        blob: () => Promise.resolve(new Blob()),
      }),
    );
  }

  form(): FormData {
    const body = this.sent[0]?.body;
    if (!(body instanceof FormData)) throw new Error('expected a multipart body');
    return body;
  }
}

const canned = (body: unknown): CannedHttp => new CannedHttp(() => Promise.resolve(body));
const key = (): string => 'test-key';
const audio = new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/webm;codecs=opus' });
const reply = {
  text: '  Kaixo taldea.  ',
  languages: [{ code: 'eu' }],
  usage: { type: 'tokens', input_tokens: 14, output_tokens: 45, total_tokens: 59 },
};

describe('OpenAITranscriptionClient', () => {
  it('asks gpt-transcribe for plain json', async () => {
    const http = canned(reply);
    await new OpenAITranscriptionClient(http, key).transcribe(audio, Language.of('eu'));

    const form = http.form();
    expect(http.sent[0]?.url).toBe('https://api.openai.com/v1/audio/transcriptions');
    expect(http.sent[0]?.headers).toEqual({ Authorization: 'Bearer test-key' });
    expect(form.get('model')).toBe('gpt-transcribe');
    expect(form.get('response_format')).toBe('json');
  });

  it('sends the meeting language as languages[] and never the singular field', async () => {
    const http = canned(reply);
    await new OpenAITranscriptionClient(http, key).transcribe(audio, Language.of('es'));

    const form = http.form();
    expect(form.getAll('languages[]')).toEqual(['es']);
    expect(form.has('language')).toBe(false);
  });

  it('asks for nothing gpt-transcribe cannot return', async () => {
    const http = canned(reply);
    await new OpenAITranscriptionClient(http, key).transcribe(audio, Language.of('en'));

    const form = http.form();
    expect(form.has('include[]')).toBe(false);
    expect(form.has('timestamp_granularities[]')).toBe(false);
  });

  it('reads the text, detected languages and usage', async () => {
    const result = await new OpenAITranscriptionClient(canned(reply), key).transcribe(
      audio,
      Language.of('eu'),
    );

    if (!result.ok) throw new Error('expected a transcription');
    expect(result.value).toEqual({
      text: '  Kaixo taldea.  ',
      languages: ['eu'],
      usage: { type: 'tokens', input_tokens: 14, output_tokens: 45, total_tokens: 59 },
    });
  });

  it('accepts a reply with only text', async () => {
    const result = await new OpenAITranscriptionClient(canned({ text: 'hi' }), key).transcribe(
      audio,
      Language.of('en'),
    );

    if (!result.ok) throw new Error('expected a transcription');
    expect(result.value).toEqual({ text: 'hi' });
  });

  it('names an unreadable reply', async () => {
    const http = new CannedHttp(() => Promise.reject(new SyntaxError('not json')));
    const result = await new OpenAITranscriptionClient(http, key).transcribe(
      audio,
      Language.of('en'),
    );

    if (result.ok) throw new Error('expected a failure');
    expect(result.error.reason).toBe('bad_response');
  });
});

describe('OpenAITranscriptionAdapter', () => {
  it('records new segments as gpt-transcribe so they price at its rate', async () => {
    const chunk = new AudioChunk({ blob: audio, startMs: 0, endMs: 30_000, mimeType: audio.type });
    const adapter = new OpenAITranscriptionAdapter(
      new OpenAITranscriptionClient(canned(reply), key),
    );

    const result = await adapter.transcribe({ chunk, language: Language.of('eu') });

    if (!result.ok) throw new Error('expected a segment');
    expect(result.value.provider).toBe('gpt-transcribe');
    expect(result.value.text.value).toBe('Kaixo taldea.');
    expect(result.value.durationMs).toBe(30_000);
  });
});
