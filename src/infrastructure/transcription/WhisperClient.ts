import type { Language } from '../../domain/language/value-objects/Language';
import { AppError } from '../../shared/errors/AppError';
import { err, ok, type Result } from '../../shared/result/Result';
import type { HttpClient } from '../http/HttpClient';

const WHISPER_URL = 'https://api.openai.com/v1/audio/transcriptions';
const WHISPER_MODEL = 'whisper-1';

export interface WhisperTranscriptionResult {
  readonly text: string;
  readonly durationSeconds?: number;
  readonly language?: string;
}

interface WhisperResponseBody {
  readonly text: string;
  readonly duration?: number;
  readonly language?: string;
}

export class WhisperClient {
  constructor(
    private readonly http: HttpClient,
    private readonly apiKeyProvider: () => string | undefined,
  ) {}

  async transcribe(
    audio: Blob,
    language: Language,
  ): Promise<Result<WhisperTranscriptionResult, AppError>> {
    const apiKey = this.apiKeyProvider();
    if (!apiKey) {
      return err(new AppError('API_KEY_INVALID', 'Whisper: missing OpenAI API key in Settings'));
    }
    const form = new FormData();
    form.append('file', audio, `chunk.${extensionFor(audio.type)}`);
    form.append('model', WHISPER_MODEL);
    form.append('language', language.code);
    form.append('response_format', 'verbose_json');

    const response = await this.http.send({
      url: WHISPER_URL,
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!response.ok) return response;
    try {
      const body = await response.value.json<WhisperResponseBody>();
      const result: WhisperTranscriptionResult = {
        text: body.text,
        ...(body.duration !== undefined ? { durationSeconds: body.duration } : {}),
        ...(body.language !== undefined ? { language: body.language } : {}),
      };
      return ok(result);
    } catch (cause) {
      return err(new AppError('TRANSCRIPTION_FAILED', 'Whisper: invalid response body', cause));
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
