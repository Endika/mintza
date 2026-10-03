import { afterEach, describe, expect, it } from 'vitest';
import { Language } from '../../src/domain/language/value-objects/Language';
import type { TranscriptionPort } from '../../src/domain/transcription/ports/TranscriptionPort';
import type { SummarizationPort } from '../../src/domain/summary/ports/SummarizationPort';
import { AudioChunk } from '../../src/domain/audio/value-objects/AudioChunk';
import { Template } from '../../src/domain/meeting/value-objects/Template';
import { TranscriptText } from '../../src/domain/transcription/value-objects/TranscriptText';
import { HttpClient } from '../../src/infrastructure/http/HttpClient';
import { ClaudeClient } from '../../src/infrastructure/llm/ClaudeClient';
import { GeminiClient } from '../../src/infrastructure/llm/GeminiClient';
import { OpenAIClient } from '../../src/infrastructure/llm/OpenAIClient';
import { SummarizationChainAdapter } from '../../src/infrastructure/llm/SummarizationChainAdapter';
import { AzureSpeechClient } from '../../src/infrastructure/transcription/AzureSpeechClient';
import { GoogleSpeechClient } from '../../src/infrastructure/transcription/GoogleSpeechClient';
import { TranscriptionChainAdapter } from '../../src/infrastructure/transcription/TranscriptionChainAdapter';
import { WhisperClient } from '../../src/infrastructure/transcription/WhisperClient';
import { AppError, type ErrorReason } from '../../src/shared/errors/AppError';
import { err, type Result } from '../../src/shared/result/Result';

const realFetch = globalThis.fetch;
const none = (): undefined => undefined;
const key = (): string => 'a-key';
const audio = new Blob(['audio'], { type: 'audio/webm' });
const en = Language.of('en');
const chat = { model: 'm', system: 's', user: 'u' };

const respondWith = (status: number, body: unknown): void => {
  globalThis.fetch = () =>
    Promise.resolve(
      new Response(typeof body === 'string' ? body : JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
    );
};

const reasonOf = <T>(result: Result<T, AppError>): ErrorReason | undefined => {
  if (result.ok) throw new Error('expected a failure');
  return result.error.reason;
};

const googleError = (code: number, status: string, reason: string): object => ({
  error: { code, status, details: [{ reason }] },
});

describe('provider errors carry a reason the interface can translate', () => {
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('names a missing key for every provider', async () => {
    const http = new HttpClient();
    expect(reasonOf(await new WhisperClient(http, none).transcribe(audio, en))).toBe('missing_key');
    expect(reasonOf(await new OpenAIClient(http, none).chat(chat))).toBe('missing_key');
    expect(reasonOf(await new ClaudeClient(http, none).chat(chat))).toBe('missing_key');
    expect(reasonOf(await new GeminiClient(http, none).chat(chat))).toBe('missing_key');
    expect(reasonOf(await new GoogleSpeechClient(http, none).recognize(audio, en))).toBe(
      'missing_key',
    );
    expect(
      reasonOf(await new AzureSpeechClient(http, none, () => 'westeurope').recognize(audio, en)),
    ).toBe('missing_key');
  });

  it('names a missing Azure region', async () => {
    const client = new AzureSpeechClient(new HttpClient(), key, () => ' ');
    expect(reasonOf(await client.recognize(audio, en))).toBe('missing_region');
  });

  it("passes Google's own reason through Speech instead of a generic hint", async () => {
    respondWith(403, googleError(403, 'PERMISSION_DENIED', 'SERVICE_DISABLED'));
    const result = await new GoogleSpeechClient(new HttpClient(), key).recognize(audio, en);
    expect(reasonOf(result)).toBe('api_disabled');
  });

  it('reads a Gemini 400 API_KEY_INVALID as an invalid key', async () => {
    respondWith(400, googleError(400, 'INVALID_ARGUMENT', 'API_KEY_INVALID'));
    expect(reasonOf(await new GeminiClient(new HttpClient(), key).chat(chat))).toBe('invalid_key');
  });

  it('reads a 401 from OpenAI as an invalid key', async () => {
    respondWith(401, { error: { message: 'Incorrect API key provided' } });
    expect(reasonOf(await new OpenAIClient(new HttpClient(), key).chat(chat))).toBe('invalid_key');
  });

  it('reads an unreachable service as a network problem', async () => {
    globalThis.fetch = () => Promise.reject(new TypeError('Failed to fetch'));
    const http = new HttpClient();
    const result = await http.send({
      url: 'https://api.openai.com/v1/models',
      method: 'GET',
      maxRetries: 0,
    });
    expect(reasonOf(result)).toBe('network');
  });

  it('tells no speech apart from a broken answer', async () => {
    respondWith(200, { results: [] });
    expect(reasonOf(await new GoogleSpeechClient(new HttpClient(), key).recognize(audio, en))).toBe(
      'no_speech',
    );
    respondWith(200, { RecognitionStatus: 'NoMatch' });
    expect(
      reasonOf(
        await new AzureSpeechClient(new HttpClient(), key, () => 'westeurope').recognize(audio, en),
      ),
    ).toBe('no_speech');
    respondWith(200, { candidates: [] });
    expect(reasonOf(await new GeminiClient(new HttpClient(), key).chat(chat))).toBe('bad_response');
    respondWith(200, 'not json');
    expect(reasonOf(await new ClaudeClient(new HttpClient(), key).chat(chat))).toBe('bad_response');
  });

  it('keeps each provider reason in the attempts of a failed chain', async () => {
    const failing = (reason: ErrorReason): TranscriptionPort & SummarizationPort => ({
      transcribe: () =>
        Promise.resolve(err(new AppError('API_KEY_INVALID', 'x', undefined, [], reason))),
      summarize: () =>
        Promise.resolve(err(new AppError('API_KEY_INVALID', 'x', undefined, [], reason))),
    });
    const transcription = await new TranscriptionChainAdapter(() => [
      { name: 'Google Speech', port: failing('api_blocked') },
      { name: 'Whisper', port: failing('missing_key') },
    ]).transcribe({
      chunk: new AudioChunk({ blob: audio, startMs: 0, endMs: 1, mimeType: 'audio/webm' }),
      language: en,
    });
    if (transcription.ok) throw new Error('expected a failure');
    expect(transcription.error.attempts.map((a) => [a.provider, a.reason])).toEqual([
      ['Google Speech', 'api_blocked'],
      ['Whisper', 'missing_key'],
    ]);

    const summary = await new SummarizationChainAdapter(() => [
      { name: 'Gemini', port: failing('invalid_key') },
    ]).summarize({
      kind: 'decisions',
      transcript: TranscriptText.of('t'),
      template: Template.work(),
      language: en,
    });
    if (summary.ok) throw new Error('expected a failure');
    expect(summary.error.attempts.map((a) => a.reason)).toEqual(['invalid_key']);
  });
});
