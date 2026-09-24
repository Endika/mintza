import { describe, expect, it } from 'vitest';
import { ConfigStore } from '../../src/presentation/state/ConfigStore';
import {
  DEFAULT_CONFIG,
  type AppConfig,
  type ConfigRepository,
} from '../../src/domain/meeting/ports/ConfigRepository';
import { AppError } from '../../src/shared/errors/AppError';
import { err, ok, type Result } from '../../src/shared/result/Result';

class FailingLoadRepo implements ConfigRepository {
  saved: AppConfig | null = null;
  load(): Promise<Result<AppConfig, AppError>> {
    return Promise.resolve(err(new AppError('STORAGE_FAILED', 'Failed to load configuration')));
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

describe('ConfigStore load guard', () => {
  it('starts with defaults and no error when the store has never been hydrated', () => {
    const store = new ConfigStore(new FailingLoadRepo());
    expect(store.get()).toEqual(DEFAULT_CONFIG);
    expect(store.getLoadError()).toBeUndefined();
  });

  it('records the load error and never writes on a failed hydrate', async () => {
    const repo = new FailingLoadRepo();
    const store = new ConfigStore(repo);
    await store.hydrate();
    expect(store.getLoadError()?.code).toBe('STORAGE_FAILED');
    expect(store.get()).toEqual(DEFAULT_CONFIG);
    expect(repo.saved).toBeNull();
  });

  it('blocks a later save instead of overwriting the unreadable stored config with defaults', async () => {
    const repo = new FailingLoadRepo();
    const store = new ConfigStore(repo);
    await store.hydrate();

    const attempted: AppConfig = { ...DEFAULT_CONFIG, apiKeys: { openai: 'sk-new' } };
    const result = await store.update(attempted);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a blocked save');
    expect(result.error.message).toBe('Failed to load configuration');
    expect(repo.saved).toBeNull();
    expect(store.get()).toEqual(DEFAULT_CONFIG);
  });

  it('saves normally once hydrate has succeeded', async () => {
    const repo = new FailingLoadRepo();
    const store = new ConfigStore(repo);
    await store.hydrate();
    expect(store.getLoadError()).toBeDefined();

    // storage recovers before the next hydrate (e.g. after a reload)
    repo.load = () => Promise.resolve(ok(DEFAULT_CONFIG));
    await store.hydrate();
    expect(store.getLoadError()).toBeUndefined();

    const next: AppConfig = { ...DEFAULT_CONFIG, apiKeys: { openai: 'sk-1' } };
    const result = await store.update(next);
    expect(result.ok).toBe(true);
    expect(repo.saved).toEqual(next);
    expect(store.get()).toEqual(next);
  });

  it('reports a save failure via the Result instead of silently keeping the old config', async () => {
    const repo: ConfigRepository = {
      load: () => Promise.resolve(ok(DEFAULT_CONFIG)),
      save: () =>
        Promise.resolve(err(new AppError('STORAGE_FAILED', 'Failed to save configuration'))),
      clear: () => Promise.resolve(ok(undefined)),
    };
    const store = new ConfigStore(repo);
    await store.hydrate();

    const next: AppConfig = { ...DEFAULT_CONFIG, apiKeys: { openai: 'sk-1' } };
    const result = await store.update(next);

    expect(result.ok).toBe(false);
    expect(store.get()).toEqual(DEFAULT_CONFIG);
  });
});
