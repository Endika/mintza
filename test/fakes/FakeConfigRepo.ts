import {
  DEFAULT_CONFIG,
  type AppConfig,
  type ConfigRepository,
} from '../../src/domain/meeting/ports/ConfigRepository';
import type { AppError } from '../../src/shared/errors/AppError';
import { ok, type Result } from '../../src/shared/result/Result';

export class FakeConfigRepo implements ConfigRepository {
  constructor(public saved: AppConfig | null = null) {}
  load(): Promise<Result<AppConfig, AppError>> {
    return Promise.resolve(ok(this.saved ?? DEFAULT_CONFIG));
  }
  save(config: AppConfig): Promise<Result<void, AppError>> {
    this.saved = config;
    return Promise.resolve(ok(undefined));
  }
  clear(): Promise<Result<void, AppError>> {
    this.saved = null;
    return Promise.resolve(ok(undefined));
  }
}
