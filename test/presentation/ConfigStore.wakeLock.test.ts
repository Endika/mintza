import { describe, expect, it } from 'vitest';
import { FakeConfigRepo } from '../fakes/FakeConfigRepo';
import { ConfigStore } from '../../src/presentation/state/ConfigStore';

describe('ConfigStore keepScreenAwake', () => {
  it('defaults to true and reflects updates', async () => {
    const store = new ConfigStore(new FakeConfigRepo());
    expect(store.keepScreenAwake()).toBe(true);
    await store.update({ ...store.get(), keepScreenAwake: false });
    expect(store.keepScreenAwake()).toBe(false);
  });
});
