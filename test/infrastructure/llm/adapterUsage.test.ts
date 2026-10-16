import { describe, expect, it } from 'vitest';
import { Language } from '../../../src/domain/language/value-objects/Language';
import { Template } from '../../../src/domain/meeting/value-objects/Template';
import { TranscriptText } from '../../../src/domain/transcription/value-objects/TranscriptText';
import {
  HttpClient,
  type HttpRequest,
  type HttpResponse,
} from '../../../src/infrastructure/http/HttpClient';
import { ClaudeClient } from '../../../src/infrastructure/llm/ClaudeClient';
import { ClaudeSummarizationAdapter } from '../../../src/infrastructure/llm/ClaudeSummarizationAdapter';
import { GeminiClient } from '../../../src/infrastructure/llm/GeminiClient';
import { GeminiSummarizationAdapter } from '../../../src/infrastructure/llm/GeminiSummarizationAdapter';
import { LLMMindMapAdapter } from '../../../src/infrastructure/llm/LLMMindMapAdapter';
import { OpenAIClient } from '../../../src/infrastructure/llm/OpenAIClient';
import { OpenAISummarizationAdapter } from '../../../src/infrastructure/llm/OpenAISummarizationAdapter';
import type { AppError } from '../../../src/shared/errors/AppError';
import { ok, type Result } from '../../../src/shared/result/Result';

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
const openAiBody = (content: string): object => ({
  choices: [{ message: { content } }],
  usage: { prompt_tokens: 1200, completion_tokens: 340 },
});

const sentBody = (http: CannedHttp): Record<string, unknown> =>
  JSON.parse(http.sent[0]?.body as string) as Record<string, unknown>;

describe('OpenAI summaries on GPT-6 Luna', () => {
  it('summarises on gpt-6-luna with reasoning off and a completion-token limit', async () => {
    const http = new CannedHttp(openAiBody('- ship'));
    await new OpenAISummarizationAdapter(new OpenAIClient(http, key)).summarize(request);
    const body = sentBody(http);
    expect(body.model).toBe('gpt-6-luna');
    expect(body.reasoning_effort).toBe('none');
    expect(body.temperature).toBe(0.2);
    expect(body.max_completion_tokens).toBe(1024);
    expect(body).not.toHaveProperty('max_tokens');
  });

  it('lets premium reason, without a temperature and with room for the reasoning', async () => {
    const http = new CannedHttp(openAiBody('- ship'));
    await new OpenAISummarizationAdapter(new OpenAIClient(http, key), {
      reasoningEffort: 'low',
    }).summarize(request);
    const body = sentBody(http);
    expect(body.reasoning_effort).toBe('low');
    expect(body).not.toHaveProperty('temperature');
    expect(body.max_completion_tokens).toBe(4096);
  });
});

describe('LLM adapters record the model that ran', () => {
  it('stamps an OpenAI summary with its model', async () => {
    const adapter = new OpenAISummarizationAdapter(
      new OpenAIClient(new CannedHttp(openAiBody('- ship')), key),
      { model: 'gpt-4o' },
    );
    const result = await adapter.summarize(request);
    if (!result.ok) throw new Error('expected a summary');
    expect(result.value.model).toBe('gpt-4o');
  });

  it('stamps a Claude summary with its model', async () => {
    const http = new CannedHttp({
      content: [{ type: 'text', text: '- ship' }],
      usage: { input_tokens: 10, output_tokens: 5 },
    });
    const adapter = new ClaudeSummarizationAdapter(new ClaudeClient(http, key), {
      model: 'claude-sonnet-5-5',
    });
    const result = await adapter.summarize(request);
    if (!result.ok) throw new Error('expected a summary');
    expect(result.value.model).toBe('claude-sonnet-5-5');
  });

  it('stamps a Gemini summary with its model', async () => {
    const http = new CannedHttp({
      candidates: [{ content: { parts: [{ text: '- ship' }] } }],
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
    });
    const adapter = new GeminiSummarizationAdapter(new GeminiClient(http, key), {
      model: 'gemini-2.0-flash',
    });
    const result = await adapter.summarize(request);
    if (!result.ok) throw new Error('expected a summary');
    expect(result.value.model).toBe('gemini-2.0-flash');
  });

  it('summarises with a Gemini model that is still served when none is given', async () => {
    const http = new CannedHttp({
      candidates: [{ content: { parts: [{ text: '- ship' }] } }],
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
    });
    const result = await new GeminiSummarizationAdapter(new GeminiClient(http, key)).summarize(
      request,
    );
    if (!result.ok) throw new Error('expected a summary');
    expect(result.value.model).toBe('gemini-3.1-flash-lite');
    expect(http.sent[0]?.url).toContain('/models/gemini-3.1-flash-lite:generateContent');
  });

  it("keeps the mind map call's model and tokens", async () => {
    const json = JSON.stringify({ label: 'Plan', children: [{ label: 'Ship', children: [] }] });
    const adapter = new LLMMindMapAdapter(
      new OpenAIClient(new CannedHttp(openAiBody(json)), key),
      'gpt-4o',
    );
    const result = await adapter.generate(request);
    if (!result.ok) throw new Error('expected a mind map');
    expect(result.value.root.label).toBe('Plan');
    expect(result.value.usage?.model).toBe('gpt-4o');
    expect(result.value.usage?.tokensIn.value).toBe(1200);
    expect(result.value.usage?.tokensOut.value).toBe(340);
  });
});
