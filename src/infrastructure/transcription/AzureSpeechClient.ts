import type { Language } from '../../domain/language/value-objects/Language';
import { AppError } from '../../shared/errors/AppError';
import { err, ok, type Result } from '../../shared/result/Result';
import type { HttpClient } from '../http/HttpClient';

const LANGUAGE_TAG: Record<string, string> = {
  es: 'es-ES',
  en: 'en-US',
  eu: 'eu-ES',
};

export interface AzureSpeechResult {
  readonly text: string;
  readonly confidence?: number;
}

interface AzureBody {
  readonly RecognitionStatus?: string;
  readonly DisplayText?: string;
  readonly NBest?: ReadonlyArray<{ readonly Confidence?: number; readonly Display?: string }>;
}

export class AzureSpeechClient {
  constructor(
    private readonly http: HttpClient,
    private readonly apiKeyProvider: () => string | undefined,
    private readonly regionProvider: () => string,
  ) {}

  async recognize(audio: Blob, language: Language): Promise<Result<AzureSpeechResult, AppError>> {
    const apiKey = this.apiKeyProvider();
    if (!apiKey) {
      return err(
        new AppError('API_KEY_INVALID', 'Azure Speech: missing subscription key in Settings'),
      );
    }
    const region = this.regionProvider();
    if (region.trim().length === 0) {
      return err(new AppError('CONFIG_INVALID', 'Azure Speech: missing region in Settings'));
    }
    const tag = LANGUAGE_TAG[language.code] ?? 'en-US';
    const url = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${encodeURIComponent(tag)}&format=detailed`;
    const response = await this.http.send({
      url,
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': audio.type || 'audio/webm;codecs=opus',
        Accept: 'application/json',
      },
      body: audio,
    });
    if (!response.ok) return response;
    try {
      const body = await response.value.json<AzureBody>();
      if (body.RecognitionStatus && body.RecognitionStatus !== 'Success') {
        return err(
          new AppError(
            'TRANSCRIPTION_FAILED',
            `Azure recognition status: ${body.RecognitionStatus}`,
          ),
        );
      }
      const best = body.NBest?.[0];
      const text = best?.Display ?? body.DisplayText ?? '';
      if (text.length === 0) {
        return err(new AppError('TRANSCRIPTION_FAILED', 'Empty Azure response'));
      }
      return ok({
        text,
        ...(best?.Confidence !== undefined ? { confidence: best.Confidence } : {}),
      });
    } catch (cause) {
      return err(new AppError('TRANSCRIPTION_FAILED', 'Invalid Azure response', cause));
    }
  }
}
