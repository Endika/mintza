import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/domain/meeting/ports/ConfigRepository';
import { LocalStorageConfigRepository } from '../../src/infrastructure/persistence/LocalStorageConfigRepository';
import { ConfigStore } from '../../src/presentation/state/ConfigStore';
import { CONFIG_STORAGE_KEY } from '../../src/shared/constants/storageKeys';
import { FakeConfigRepo } from '../fakes/FakeConfigRepo';

describe('ConfigStore Google keys', () => {
  beforeEach(() => window.localStorage.clear());

  it('uses the old Google key for Speech when a stored v1 config has no Speech key', async () => {
    window.localStorage.setItem(
      CONFIG_STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_CONFIG, apiKeys: { google: 'AIza-legacy' } }),
    );
    const store = new ConfigStore(new LocalStorageConfigRepository(window.localStorage));
    await store.hydrate();
    expect(store.googleKey()).toBe('AIza-legacy');
    expect(store.googleSpeechKey()).toBe('AIza-legacy');
  });

  it('never lends a Gemini-only AQ. key to Speech', async () => {
    const aqKey = `AQ.${'Ab8RN6Lz_q-W'.repeat(5)}`.slice(0, 53);
    const store = new ConfigStore(
      new FakeConfigRepo({ ...DEFAULT_CONFIG, apiKeys: { google: aqKey } }),
    );
    await store.hydrate();
    expect(store.googleKey()).toBe(aqKey);
    expect(store.googleSpeechKey()).toBeUndefined();
  });

  it('prefers an explicit Speech key and keeps the Gemini key apart', async () => {
    const store = new ConfigStore(
      new FakeConfigRepo({
        ...DEFAULT_CONFIG,
        apiKeys: { google: 'AIza-gemini', googleSpeech: 'AIza-speech' },
      }),
    );
    await store.hydrate();
    expect(store.googleKey()).toBe('AIza-gemini');
    expect(store.googleSpeechKey()).toBe('AIza-speech');
  });

  it('has a Speech key even when only the Speech field is filled in', async () => {
    const store = new ConfigStore(
      new FakeConfigRepo({ ...DEFAULT_CONFIG, apiKeys: { googleSpeech: 'AIza-speech' } }),
    );
    await store.hydrate();
    expect(store.googleKey()).toBeUndefined();
    expect(store.googleSpeechKey()).toBe('AIza-speech');
  });
});
