import type { Language } from '../../domain/language/value-objects/Language';
import { AppError } from '../../shared/errors/AppError';
import { err, ok, type Result } from '../../shared/result/Result';
import type { HttpClient } from '../http/HttpClient';

const TRANSCRIPTIONS_URL = 'https://api.openai.com/v1/audio/transcriptions';
const TRANSCRIPTION_MODEL = 'gpt-transcribe';

export type TranscriptionUsage =
  | {
      readonly type: 'tokens';
      readonly input_tokens: number;
      readonly output_tokens: number;
      readonly total_tokens: number;
    }
  | { readonly type: 'duration'; readonly seconds: number };

export interface OpenAITranscriptionResult {
  readonly text: string;
  readonly languages?: readonly string[];
  readonly usage?: TranscriptionUsage;
}

interface TranscriptionResponseBody {
  readonly text: string;
  readonly languages?: readonly { readonly code: string }[];
  readonly usage?: TranscriptionUsage;
}

export class OpenAITranscriptionClient {
  constructor(
    private readonly http: HttpClient,
    private readonly apiKeyProvider: () => string | undefined,
  ) {}

  async transcribe(
    audio: Blob,
    language: Language,
  ): Promise<Result<OpenAITranscriptionResult, AppError>> {
    const apiKey = this.apiKeyProvider();
    if (!apiKey) {
      return err(
        new AppError(
          'API_KEY_INVALID',
          'GPT Transcribe: missing OpenAI API key',
          undefined,
          [],
          'missing_key',
        ),
      );
    }
    const form = new FormData();
    form.append('file', audio, `chunk.${extensionFor(audio.type)}`);
    form.append('model', TRANSCRIPTION_MODEL);
    // gpt-transcribe replaced the singular `language` with this list; sending both is rejected.
    form.append('languages[]', language.code);
    form.append('response_format', 'json');

    const response = await this.http.send({
      url: TRANSCRIPTIONS_URL,
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!response.ok) return response;
    try {
      const body = await response.value.json<TranscriptionResponseBody>();
      const result: OpenAITranscriptionResult = {
        text: body.text,
        ...(body.languages ? { languages: body.languages.map((l) => l.code) } : {}),
        ...(body.usage ? { usage: body.usage } : {}),
      };
      return ok(result);
    } catch (cause) {
      return err(
        new AppError(
          'TRANSCRIPTION_FAILED',
          'GPT Transcribe: invalid response body',
          cause,
          [],
          'bad_response',
        ),
      );
    }
  }
}

const extensionFor = (mimeType: string): string => {
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('wav')) return 'wav';
  return 'webm';
};
