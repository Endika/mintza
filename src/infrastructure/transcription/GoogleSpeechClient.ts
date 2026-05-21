import type { Language } from '../../domain/language/value-objects/Language';
import { AppError } from '../../shared/errors/AppError';
import { err, ok, type Result } from '../../shared/result/Result';
import type { HttpClient } from '../http/HttpClient';

const GOOGLE_URL = 'https://speech.googleapis.com/v1/speech:recognize';

export interface GoogleSpeechResult {
  readonly text: string;
  readonly confidence?: number;
}

interface GoogleResponseBody {
  readonly results?: ReadonlyArray<{
    readonly alternatives?: ReadonlyArray<{
      readonly transcript?: string;
      readonly confidence?: number;
    }>;
  }>;
}

const LANGUAGE_TAG: Record<string, string> = {
  es: 'es-ES',
  en: 'en-US',
  eu: 'eu-ES',
};

export class GoogleSpeechClient {
  constructor(
    private readonly http: HttpClient,
    private readonly apiKeyProvider: () => string | undefined,
  ) {}

  async recognize(
    audio: Blob,
    language: Language,
  ): Promise<Result<GoogleSpeechResult, AppError>> {
    const apiKey = this.apiKeyProvider();
    if (!apiKey) {
      return err(
        new AppError('API_KEY_INVALID', 'Google Speech: missing Google API key in Settings'),
      );
    }
    const base64 = await blobToBase64(audio);
    const body = JSON.stringify({
      config: {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 48000,
        languageCode: LANGUAGE_TAG[language.code] ?? 'en-US',
        enableAutomaticPunctuation: true,
      },
      audio: { content: base64 },
    });
    const url = `${GOOGLE_URL}?key=${encodeURIComponent(apiKey)}`;
    const response = await this.http.send({
      url,
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    });
    if (!response.ok) return response;
    try {
      const parsed = await response.value.json<GoogleResponseBody>();
      const first = parsed.results?.[0]?.alternatives?.[0];
      const text = first?.transcript ?? '';
      if (text.length === 0) {
        return err(new AppError('TRANSCRIPTION_FAILED', 'Google Speech: empty response (no audio detected?)'));
      }
      return ok({
        text,
        ...(first?.confidence !== undefined ? { confidence: first.confidence } : {}),
      });
    } catch (cause) {
      return err(new AppError('TRANSCRIPTION_FAILED', 'Google Speech: invalid response body', cause));
    }
  }
}

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = (): void => reject(new Error('FileReader error'));
    reader.onload = (): void => {
      const url = typeof reader.result === 'string' ? reader.result : '';
      const comma = url.indexOf(',');
      resolve(comma >= 0 ? url.slice(comma + 1) : '');
    };
    reader.readAsDataURL(blob);
  });
