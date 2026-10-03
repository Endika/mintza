import { describe, expect, it } from 'vitest';
import { FakeConfigRepo } from '../fakes/FakeConfigRepo';
import { ConfigStore } from '../../src/presentation/state/ConfigStore';
import { DEFAULT_CONFIG } from '../../src/domain/meeting/ports/ConfigRepository';

describe('ConfigStore document language', () => {
  it('sets <html lang> on hydrate and on update', async () => {
    const store = new ConfigStore(new FakeConfigRepo({ ...DEFAULT_CONFIG, language: 'es' }));
    await store.hydrate();
    expect(document.documentElement.lang).toBe('es');
    await store.update({ ...store.get(), language: 'eu' });
    expect(document.documentElement.lang).toBe('eu');
  });
});
