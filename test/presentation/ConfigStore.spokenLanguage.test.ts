import { beforeEach, describe, expect, it } from 'vitest';
import { LocalStorageConfigRepository } from '../../src/infrastructure/persistence/LocalStorageConfigRepository';
import { CONFIG_STORAGE_KEY } from '../../src/shared/constants/storageKeys';
import { FakeConfigRepo } from '../fakes/FakeConfigRepo';
import { ConfigStore } from '../../src/presentation/state/ConfigStore';
import { DEFAULT_CONFIG, type AppConfig } from '../../src/domain/meeting/ports/ConfigRepository';

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

  describe('over the real localStorage', () => {
    beforeEach(() => window.localStorage.clear());

    const store = async (): Promise<ConfigStore> => {
      const s = new ConfigStore(new LocalStorageConfigRepository(window.localStorage));
      await s.hydrate();
      return s;
    };

    it('reads a stored v1 config without the field as the interface language', async () => {
      const { spokenLanguage: _unset, ...v1 } = { ...DEFAULT_CONFIG, language: 'es' as const };
      window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(v1));

      expect((await store()).spokenLanguage()).toBe('es');
    });

    it('persists an explicit value and reads it back after a restart', async () => {
      const first = await store();
      await first.update({ ...first.get(), language: 'es', spokenLanguage: 'eu' });

      expect(
        (JSON.parse(window.localStorage.getItem(CONFIG_STORAGE_KEY)!) as AppConfig).spokenLanguage,
      ).toBe('eu');
      const second = await store();
      expect(second.get().language).toBe('es');
      expect(second.spokenLanguage()).toBe('eu');
    });
  });
});
