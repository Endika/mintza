import {
  DEFAULT_CONFIG,
  type AppConfig,
  type ConfigRepository,
} from '../../domain/meeting/ports/ConfigRepository';
import type { AppError } from '../../shared/errors/AppError';
import { err, type Result } from '../../shared/result/Result';
import { Translator } from '../i18n/Translator';

export type ConfigListener = (config: AppConfig) => void;

export class ConfigStore {
  private current: AppConfig = DEFAULT_CONFIG;
  private readonly listeners: Set<ConfigListener> = new Set();
  readonly translator: Translator = new Translator();
  private loadError: AppError | undefined;

  constructor(private readonly repository: ConfigRepository) {}

  async hydrate(): Promise<void> {
    const result = await this.repository.load();
    if (result.ok) {
      this.loadError = undefined;
      this.current = result.value;
      this.translator.setLanguage(result.value.language);
    } else {
      this.loadError = result.error;
    }
  }

  /** Set when hydrate() couldn't read the stored config; a save is then blocked to avoid overwriting it. */
  getLoadError(): AppError | undefined {
    return this.loadError;
  }

  get(): AppConfig {
    return this.current;
  }

  openAIKey(): string | undefined {
    return this.current.apiKeys.openai;
  }

  anthropicKey(): string | undefined {
    return this.current.apiKeys.anthropic;
  }

  googleKey(): string | undefined {
    return this.current.apiKeys.google;
  }

  azureKey(): string | undefined {
    return this.current.apiKeys.azure;
  }

  azureRegion(): string {
    return this.current.azureRegion;
  }

  keepScreenAwake(): boolean {
    return this.current.keepScreenAwake ?? true;
  }

  async update(config: AppConfig): Promise<Result<void, AppError>> {
    if (this.loadError) return err(this.loadError);
    const result = await this.repository.save(config);
    if (result.ok) {
      this.current = config;
      this.translator.setLanguage(config.language);
      this.listeners.forEach((l) => l(config));
    }
    return result;
  }

  subscribe(listener: ConfigListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
