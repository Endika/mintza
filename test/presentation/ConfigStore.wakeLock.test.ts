import { describe, expect, it } from 'vitest';
import { ConfigStore } from '../../src/presentation/state/ConfigStore';
import {
  DEFAULT_CONFIG,
  type AppConfig,
  type ConfigRepository,
} from '../../src/domain/meeting/ports/ConfigRepository';
import { ok, type Result } from '../../src/shared/result/Result';
import type { AppError } from '../../src/shared/errors/AppError';

class FakeConfigRepo implements ConfigRepository {
  saved: AppConfig | null = null;
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

describe('ConfigStore keepScreenAwake', () => {
  it('defaults to true and reflects updates', async () => {
    const store = new ConfigStore(new FakeConfigRepo());
    expect(store.keepScreenAwake()).toBe(true);
    await store.update({ ...store.get(), keepScreenAwake: false });
    expect(store.keepScreenAwake()).toBe(false);
  });
});
