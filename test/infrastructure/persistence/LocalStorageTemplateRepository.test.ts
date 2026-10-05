import { describe, expect, it } from 'vitest';
import { LocalStorageTemplateRepository } from '../../../src/infrastructure/persistence/LocalStorageTemplateRepository';
import type { TemplateDefinition } from '../../../src/domain/meeting/value-objects/Template';

const STORAGE_KEY = 'mintza:templates:v1';

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

class FullStorage extends FakeStorage {
  override setItem(): never {
    throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
  }
}

const customTemplate: TemplateDefinition = {
  id: 'standup',
  name: 'Daily standup',
  builtIn: false,
  systemRole: 'a daily standup',
  mindMapStructure: 'Yesterday → Today → Blockers',
  summaryKinds: ['bullet_points', 'action_items'],
  featuredOrder: ['action_items', 'bullet_points'],
  kindLabels: { bullet_points: 'Highlights' },
  promptOverrides: { action_items: 'List concrete action items.' },
};

describe('LocalStorageTemplateRepository', () => {
  it('returns an empty list when nothing is stored yet', async () => {
    const repo = new LocalStorageTemplateRepository(new FakeStorage());
    const result = await repo.load();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual([]);
  });

  it('reports a failure instead of crashing on corrupt stored JSON', async () => {
    const storage = new NoWriteStorage();
    storage.seed(STORAGE_KEY, '{not json');
    const result = await new LocalStorageTemplateRepository(storage).load();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('STORAGE_FAILED');
  });

  it('starts empty when the stored value is not an array, without crashing', async () => {
    const storage = new NoWriteStorage();
    storage.seed(STORAGE_KEY, JSON.stringify({ not: 'an array' }));
    const result = await new LocalStorageTemplateRepository(storage).load();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual([]);
  });

  it('never writes while loading, whether missing or corrupt', async () => {
    const storage = new NoWriteStorage();
    await expect(new LocalStorageTemplateRepository(storage).load()).resolves.toMatchObject({
      ok: true,
    });
    storage.seed(STORAGE_KEY, 'not json');
    await expect(new LocalStorageTemplateRepository(storage).load()).resolves.toMatchObject({
      ok: false,
    });
  });

  it('treats a throwing getItem as a reported failure, without crashing', async () => {
    const result = await new LocalStorageTemplateRepository(new ThrowingGetStorage()).load();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('STORAGE_FAILED');
  });

  it('loads back a fixture built via the real save path, complete (format guard)', async () => {
    const storage = new FakeStorage();
    const writer = new LocalStorageTemplateRepository(storage);
    const saved = await writer.save(customTemplate);
    expect(saved.ok).toBe(true);

    const reader = new LocalStorageTemplateRepository(storage);
    const loaded = await reader.load();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.value).toEqual([customTemplate]);
  });

  it('loads a literal snapshot of the current on-disk format back complete (format guard)', async () => {
    const storage = new FakeStorage();
    const snapshotJson =
      '[{"id":"standup","name":"Daily standup","systemRole":"a daily standup",' +
      '"mindMapStructure":"Yesterday \\u2192 Today \\u2192 Blockers",' +
      '"summaryKinds":["bullet_points","action_items"],' +
      '"featuredOrder":["action_items","bullet_points"],' +
      '"kindLabels":{"bullet_points":"Highlights"},' +
      '"promptOverrides":{"action_items":"List concrete action items."}}]';
    storage.setItem(STORAGE_KEY, snapshotJson);

    const loaded = await new LocalStorageTemplateRepository(storage).load();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.value).toEqual([customTemplate]);
  });

  it('refuses to change or delete a built-in template, saying why', async () => {
    const repo = new LocalStorageTemplateRepository(new FakeStorage());
    const saved = await repo.save({ ...customTemplate, builtIn: true });
    const deleted = await repo.delete('generic');
    expect(saved.ok || saved.error.reason).toBe('builtin_readonly');
    expect(deleted.ok || deleted.error.reason).toBe('builtin_readonly');
  });

  it('refuses a custom template whose id is a built-in one, saying why', async () => {
    const saved = await new LocalStorageTemplateRepository(new FakeStorage()).save({
      ...customTemplate,
      id: 'generic',
    });
    expect(saved.ok || saved.error.reason).toBe('id_collision');
  });

  it('says the storage is full when saving runs out of quota', async () => {
    const saved = await new LocalStorageTemplateRepository(new FullStorage()).save(customTemplate);
    expect(saved.ok || saved.error.reason).toBe('storage_full');
  });
});
