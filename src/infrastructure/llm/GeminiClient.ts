import { AppError } from '../../shared/errors/AppError';
import { err, ok, type Result } from '../../shared/result/Result';
import type { HttpClient } from '../http/HttpClient';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export interface GeminiChatRequest {
  readonly model: string;
  readonly system: string;
  readonly user: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
}

export interface GeminiChatResponse {
  readonly content: string;
  readonly promptTokens: number;
  readonly completionTokens: number;
}

interface GeminiBody {
  readonly candidates?: ReadonlyArray<{
    readonly content?: { readonly parts?: ReadonlyArray<{ readonly text?: string }> };
  }>;
  readonly usageMetadata?: {
    readonly promptTokenCount?: number;
    readonly candidatesTokenCount?: number;
  };
}

export class GeminiClient {
  constructor(
    private readonly http: HttpClient,
    private readonly apiKeyProvider: () => string | undefined,
  ) {}

  async chat(request: GeminiChatRequest): Promise<Result<GeminiChatResponse, AppError>> {
    const apiKey = this.apiKeyProvider();
    if (!apiKey) {
      return err(new AppError('API_KEY_INVALID', 'Gemini: missing Google API key in Settings'));
    }
    const url = `${GEMINI_BASE}/${request.model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const body = JSON.stringify({
      systemInstruction: { parts: [{ text: request.system }] },
      contents: [{ role: 'user', parts: [{ text: request.user }] }],
      generationConfig: {
        temperature: request.temperature ?? 0.2,
        maxOutputTokens: request.maxTokens ?? 1024,
      },
    });
    const response = await this.http.send({
      url,
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    });
    if (!response.ok) return response;
    try {
      const parsed = await response.value.json<GeminiBody>();
      const text =
        parsed.candidates
          ?.flatMap((c) => c.content?.parts ?? [])
          .map((p) => p.text ?? '')
          .join('') ?? '';
      if (text.length === 0) {
        return err(new AppError('SUMMARIZATION_FAILED', 'Gemini: empty response'));
      }
      return ok({
        content: text,
        promptTokens: parsed.usageMetadata?.promptTokenCount ?? 0,
        completionTokens: parsed.usageMetadata?.candidatesTokenCount ?? 0,
      });
    } catch (cause) {
      return err(new AppError('SUMMARIZATION_FAILED', 'Gemini: invalid response body', cause));
    }
  }
}
