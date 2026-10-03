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

describe('ConfigStore spoken language', () => {
  it('falls back to the interface language for a v1 config that never stored one', async () => {
    const store = new ConfigStore(new FakeConfigRepo({ ...DEFAULT_CONFIG, language: 'eu' }));
    await store.hydrate();
    expect(store.spokenLanguage()).toBe('eu');
  });

  it('keeps an explicit spoken language when the interface language changes', async () => {
    const repo = new FakeConfigRepo({ ...DEFAULT_CONFIG, language: 'es', spokenLanguage: 'en' });
    const store = new ConfigStore(repo);
    await store.hydrate();
    await store.update({ ...store.get(), language: 'eu' });
    expect(store.spokenLanguage()).toBe('en');
    expect(repo.saved?.spokenLanguage).toBe('en');
  });
});
