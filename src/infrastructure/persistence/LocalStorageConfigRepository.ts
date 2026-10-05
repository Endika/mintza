import {
  DEFAULT_CONFIG,
  type AppConfig,
  type ConfigRepository,
} from '../../domain/meeting/ports/ConfigRepository';
import type { AppError } from '../../shared/errors/AppError';
import { CONFIG_STORAGE_KEY } from '../../shared/constants/storageKeys';
import { err, ok, type Result } from '../../shared/result/Result';
import { storageError } from './storageError';

export class LocalStorageConfigRepository implements ConfigRepository {
  constructor(private readonly storage: Storage = window.localStorage) {}

  load(): Promise<Result<AppConfig, AppError>> {
    try {
      const raw = this.storage.getItem(CONFIG_STORAGE_KEY);
      if (!raw) return Promise.resolve(ok(DEFAULT_CONFIG));
      const parsed = JSON.parse(raw) as Partial<AppConfig>;
      return Promise.resolve(ok({ ...DEFAULT_CONFIG, ...parsed, apiKeys: { ...parsed.apiKeys } }));
    } catch (cause) {
      return Promise.resolve(err(storageError('Failed to load configuration', cause)));
    }
  }

  save(config: AppConfig): Promise<Result<void, AppError>> {
    try {
      this.storage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
      return Promise.resolve(ok(undefined));
    } catch (cause) {
      return Promise.resolve(err(storageError('Failed to save configuration', cause)));
    }
  }

  clear(): Promise<Result<void, AppError>> {
    try {
      this.storage.removeItem(CONFIG_STORAGE_KEY);
      return Promise.resolve(ok(undefined));
    } catch (cause) {
      return Promise.resolve(err(storageError('Failed to clear configuration', cause)));
    }
  }
}
