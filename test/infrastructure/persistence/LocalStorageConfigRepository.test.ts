import { describe, expect, it } from 'vitest';
import { LocalStorageConfigRepository } from '../../../src/infrastructure/persistence/LocalStorageConfigRepository';
import { DEFAULT_CONFIG, type AppConfig } from '../../../src/domain/meeting/ports/ConfigRepository';

class FakeStorage implements Storage {
  private readonly map = new Map<string, string>();
  get length(): number {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

/** setItem must never be called while just reading; this fails the test if it is. */
class NoWriteStorage extends FakeStorage {
  seed(key: string, value: string): void {
    super.setItem(key, value);
  }
  override setItem(): never {
    throw new Error('reading must never write');
  }
}

class ThrowingGetStorage implements Storage {
  readonly length = 0;
  clear(): void {}
  getItem(): never {
    throw new Error('storage unavailable');
  }
  key(): null {
    return null;
  }
  removeItem(): void {}
  setItem(): void {}
}

class ThrowingSetStorage extends FakeStorage {
  override setItem(): never {
    throw new Error('quota exceeded');
  }
}

describe('LocalStorageConfigRepository', () => {
  it('returns defaults when nothing is stored yet', async () => {
    const repo = new LocalStorageConfigRepository(new FakeStorage());
    const result = await repo.load();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual(DEFAULT_CONFIG);
  });

  it('reports a failure instead of crashing on corrupt stored JSON', async () => {
    const storage = new NoWriteStorage();
    storage.seed('mintza:config:v1', '{not json');
    const repo = new LocalStorageConfigRepository(storage);
    const result = await repo.load();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('STORAGE_FAILED');
  });

  it('never writes while loading, whether missing or corrupt', async () => {
    const storage = new NoWriteStorage();
    await expect(new LocalStorageConfigRepository(storage).load()).resolves.toMatchObject({
      ok: true,
    });
    storage.seed('mintza:config:v1', 'not json');
    await expect(new LocalStorageConfigRepository(storage).load()).resolves.toMatchObject({
      ok: false,
    });
  });

  it('treats a throwing getItem as a reported failure, without crashing', async () => {
    const repo = new LocalStorageConfigRepository(new ThrowingGetStorage());
    const result = await repo.load();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('STORAGE_FAILED');
  });

  it('loads back a fixture built via the real save path, complete (format guard)', async () => {
    const storage = new FakeStorage();
    const config: AppConfig = {
      language: 'es',
      defaultTemplate: 'interview',
      transcriptionQuality: 'premium',
      summaryQuality: 'cheap',
      apiKeys: {
        openai: 'sk-openai',
        anthropic: 'sk-anthropic',
        google: 'sk-google',
        azure: 'sk-azure',
      },
      azureRegion: 'francecentral',
      keepScreenAwake: false,
    };
    const writer = new LocalStorageConfigRepository(storage);
    const saved = await writer.save(config);
    expect(saved.ok).toBe(true);

    const reader = new LocalStorageConfigRepository(storage);
    const loaded = await reader.load();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.value).toEqual(config);
  });

  it('reports a failed save instead of throwing or claiming success', async () => {
    const repo = new LocalStorageConfigRepository(new ThrowingSetStorage());
    const result = await repo.save(DEFAULT_CONFIG);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('STORAGE_FAILED');
  });
});
