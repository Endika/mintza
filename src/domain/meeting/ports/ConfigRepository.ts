import type { Result } from '../../../shared/result/Result';
import type { AppError } from '../../../shared/errors/AppError';
import type { LanguageCode } from '../../language/value-objects/Language';
import type { TemplateKind } from '../value-objects/Template';

export type QualityProfile = 'cheap' | 'balanced' | 'premium';

export interface ApiKeys {
  readonly openai?: string;
  readonly google?: string;
  readonly azure?: string;
  readonly anthropic?: string;
}

export interface AppConfig {
  readonly language: LanguageCode;
  readonly defaultTemplate: TemplateKind;
  readonly transcriptionQuality: QualityProfile;
  readonly summaryQuality: QualityProfile;
  readonly apiKeys: ApiKeys;
  readonly azureRegion: string;
  readonly keepScreenAwake?: boolean;
}

export const DEFAULT_CONFIG: AppConfig = {
  language: 'en',
  defaultTemplate: 'generic',
  transcriptionQuality: 'balanced',
  summaryQuality: 'balanced',
  apiKeys: {},
  azureRegion: 'westeurope',
  keepScreenAwake: true,
};

export interface ConfigRepository {
  load(): Promise<Result<AppConfig, AppError>>;
  save(config: AppConfig): Promise<Result<void, AppError>>;
  clear(): Promise<Result<void, AppError>>;
}
