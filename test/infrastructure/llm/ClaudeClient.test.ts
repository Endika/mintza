import { describe, expect, it } from 'vitest';
import { Language } from '../../../src/domain/language/value-objects/Language';
import { Template } from '../../../src/domain/meeting/value-objects/Template';
import { TranscriptText } from '../../../src/domain/transcription/value-objects/TranscriptText';
import { HttpApiKeyValidator } from '../../../src/infrastructure/api/HttpApiKeyValidator';
import {
  HttpClient,
  type HttpRequest,
  type HttpResponse,
} from '../../../src/infrastructure/http/HttpClient';
import { ClaudeClient } from '../../../src/infrastructure/llm/ClaudeClient';
import { ClaudeSummarizationAdapter } from '../../../src/infrastructure/llm/ClaudeSummarizationAdapter';
import { SummarizationChainAdapter } from '../../../src/infrastructure/llm/SummarizationChainAdapter';
import { reasonText } from '../../../src/presentation/i18n/errorText';
import { Translator } from '../../../src/presentation/i18n/Translator';
import { PRICING } from '../../../src/shared/constants/pricing';
import type { AppError } from '../../../src/shared/errors/AppError';
import { ok, type Result } from '../../../src/shared/result/Result';
import { FakeSummarizationPort } from '../../fakes/FakeSummarizationPort';

class CannedHttp extends HttpClient {
  readonly sent: HttpRequest[] = [];
  constructor(private readonly body: unknown) {
    super();
  }

  override send(request: HttpRequest): Promise<Result<HttpResponse, AppError>> {
    this.sent.push(request);
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

const key = (): string => 'test-key';
const request = {
  kind: 'decisions' as const,
  transcript: TranscriptText.of('We agreed to ship on Monday.'),
  template: Template.work(),
  language: Language.of('en'),
};
const answer = {
  model: 'claude-sonnet-5-5',
  stop_reason: 'end_turn',
  content: [{ type: 'text', text: '- ship' }],
  usage: { input_tokens: 10, output_tokens: 5 },
};

const sentBody = (http: CannedHttp): Record<string, unknown> =>
  JSON.parse(http.sent[0]?.body as string) as Record<string, unknown>;

const summarise = async (body: unknown): Promise<CannedHttp> => {
  const http = new CannedHttp(body);
  await new ClaudeSummarizationAdapter(new ClaudeClient(http, key)).summarize(request);
  return http;
};

describe('Claude summaries on Sonnet 5.5', () => {
  it('asks for claude-sonnet-5-5 and stamps the summary with it', async () => {
    const http = new CannedHttp(answer);
    const result = await new ClaudeSummarizationAdapter(new ClaudeClient(http, key)).summarize(
      request,
    );
    if (!result.ok) throw new Error('expected a summary');
    expect(sentBody(http).model).toBe('claude-sonnet-5-5');
    expect(result.value.model).toBe('claude-sonnet-5-5');
  });

  it('sends no sampling parameters, thinking setting or prefill', async () => {
    const body = sentBody(await summarise(answer));
    expect(body).not.toHaveProperty('temperature');
    expect(body).not.toHaveProperty('top_p');
    expect(body).not.toHaveProperty('top_k');
    expect(body).not.toHaveProperty('thinking');
    expect(body.messages).toEqual([{ role: 'user', content: expect.any(String) as string }]);
  });

  it('summarises at low effort with room for thinking', async () => {
    const body = sentBody(await summarise(answer));
    expect(body.output_config).toEqual({ effort: 'low' });
    expect(body.max_tokens).toBe(4096);
  });

  it('opts into the server-side fallback', async () => {
    const http = await summarise(answer);
    expect(http.sent[0]?.headers?.['anthropic-beta']).toBe('server-side-fallback-2026-07-01');
    expect(sentBody(http).fallbacks).toBe('default');
  });

  it('keeps the version and direct browser access headers', async () => {
    const headers = (await summarise(answer)).sent[0]?.headers;
    expect(headers?.['anthropic-version']).toBe('2023-06-01');
    expect(headers?.['anthropic-dangerous-direct-browser-access']).toBe('true');
  });

  it('builds the text only from text blocks', async () => {
    const http = new CannedHttp({
      ...answer,
      content: [
        { type: 'thinking', thinking: '', signature: 'sig' },
        {
          type: 'fallback',
          from: { model: 'claude-sonnet-5-5' },
          to: { model: 'claude-sonnet-5' },
        },
        { type: 'text', text: '- ship ' },
        { type: 'text', text: 'on Monday' },
      ],
    });
    const result = await new ClaudeClient(http, key).chat({ model: 'm', system: 's', user: 'u' });
    if (!result.ok) throw new Error('expected an answer');
    expect(result.value.content).toBe('- ship on Monday');
  });

  it('turns a refusal into a failure the chain can fall through', async () => {
    const http = new CannedHttp({
      ...answer,
      stop_reason: 'refusal',
      stop_details: { type: 'refusal', category: 'general_harms', explanation: null },
      content: [{ type: 'text', text: 'partial' }],
    });
    const result = await new ClaudeClient(http, key).chat({ model: 'm', system: 's', user: 'u' });
    if (result.ok) throw new Error('expected a refusal');
    expect(result.error.code).toBe('SUMMARIZATION_FAILED');
    expect(result.error.reason).toBe('refused');
  });

  it('turns a reply cut off at max_tokens into a failure', async () => {
    const http = new CannedHttp({
      ...answer,
      stop_reason: 'max_tokens',
      content: [{ type: 'text', text: '- ship on Mon' }],
    });
    const result = await new ClaudeClient(http, key).chat({ model: 'm', system: 's', user: 'u' });
    if (result.ok) throw new Error('expected a truncated reply');
    expect(result.error.reason).toBe('truncated');
  });

  it.each(['refusal', 'max_tokens'])(
    'moves on to the next provider when Claude stops at %s',
    async (stopReason) => {
      const claude = new ClaudeSummarizationAdapter(
        new ClaudeClient(new CannedHttp({ ...answer, stop_reason: stopReason, content: [] }), key),
      );
      const next = new FakeSummarizationPort({
        kind: 'success',
        content: '- ship',
        provider: 'openai',
      });
      const chain = new SummarizationChainAdapter(() => [
        { name: 'Claude', port: claude },
        { name: 'OpenAI', port: next },
      ]);
      const result = await chain.summarize(request);
      expect(result.ok && result.value.provider).toBe('openai');
      expect(next.calls).toHaveLength(1);
    },
  );

  it('keeps each refusal in the attempts when every provider fails', async () => {
    const refusing = (): ClaudeSummarizationAdapter =>
      new ClaudeSummarizationAdapter(
        new ClaudeClient(new CannedHttp({ ...answer, stop_reason: 'refusal', content: [] }), key),
      );
    const chain = new SummarizationChainAdapter(() => [
      { name: 'Claude', port: refusing() },
      { name: 'Claude again', port: refusing() },
    ]);
    const result = await chain.summarize(request);
    if (result.ok) throw new Error('expected the chain to fail');
    expect(result.error.attempts.map((a) => [a.provider, a.reason])).toEqual([
      ['Claude', 'refused'],
      ['Claude again', 'refused'],
    ]);
  });

  it.each(['refused', 'truncated'] as const)('explains %s in every language', (reason) => {
    for (const lang of ['en', 'es', 'eu'] as const) {
      const text = reasonText(reason, (k) => new Translator(lang).t(k));
      expect(text).not.toBe(reasonText('unknown', (k) => new Translator(lang).t(k)));
      expect(text.length).toBeGreaterThan(0);
    }
  });

  it('checks an Anthropic key by listing models, without a paid call', async () => {
    const http = new CannedHttp({ data: [] });
    const result = await new HttpApiKeyValidator(http).validate('anthropic', 'sk-ant-key');
    if (!result.ok) throw new Error('validation should produce checks');
    expect(result.value.checks).toEqual([{ service: 'Anthropic', ok: true }]);
    expect(http.sent[0]?.url).toBe('https://api.anthropic.com/v1/models');
    expect(http.sent[0]?.method).toBe('GET');
    expect(http.sent[0]?.body).toBeUndefined();
    expect(http.sent[0]?.headers).toEqual({
      'x-api-key': 'sk-ant-key',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    });
  });

  it('prices Sonnet 5.5 and still prices Sonnet 4.5', () => {
    expect(PRICING.llm['claude-sonnet-5-5']).toEqual({ inputPerMillion: 2, outputPerMillion: 10 });
    expect(PRICING.llm['claude-sonnet-4-5']).toEqual({ inputPerMillion: 3, outputPerMillion: 15 });
  });
});
