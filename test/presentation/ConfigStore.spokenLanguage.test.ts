import { describe, expect, it } from 'vitest';
import { FakeConfigRepo } from '../fakes/FakeConfigRepo';
import { ConfigStore } from '../../src/presentation/state/ConfigStore';
import { DEFAULT_CONFIG } from '../../src/domain/meeting/ports/ConfigRepository';

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
