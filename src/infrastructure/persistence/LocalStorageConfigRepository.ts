import {
  DEFAULT_CONFIG,
  type AppConfig,
  type ConfigRepository,
} from '../../domain/meeting/ports/ConfigRepository';
import { AppError } from '../../shared/errors/AppError';
import { err, ok, type Result } from '../../shared/result/Result';

const STORAGE_KEY = 'mintza:config:v1';

export class LocalStorageConfigRepository implements ConfigRepository {
  constructor(private readonly storage: Storage = window.localStorage) {}

  load(): Promise<Result<AppConfig, AppError>> {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return Promise.resolve(ok(DEFAULT_CONFIG));
      const parsed = JSON.parse(raw) as Partial<AppConfig>;
      return Promise.resolve(
        ok({ ...DEFAULT_CONFIG, ...parsed, apiKeys: { ...parsed.apiKeys } }),
      );
    } catch (cause) {
      return Promise.resolve(
        err(new AppError('STORAGE_FAILED', 'Failed to load configuration', cause)),
      );
    }
  }

  save(config: AppConfig): Promise<Result<void, AppError>> {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(config));
      return Promise.resolve(ok(undefined));
    } catch (cause) {
      return Promise.resolve(
        err(new AppError('STORAGE_FAILED', 'Failed to save configuration', cause)),
      );
    }
  }

  clear(): Promise<Result<void, AppError>> {
    try {
      this.storage.removeItem(STORAGE_KEY);
      return Promise.resolve(ok(undefined));
    } catch (cause) {
      return Promise.resolve(
        err(new AppError('STORAGE_FAILED', 'Failed to clear configuration', cause)),
      );
    }
  }
}
