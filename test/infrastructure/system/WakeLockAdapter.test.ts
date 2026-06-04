import { describe, expect, it } from 'vitest';
import {
  WakeLockAdapter,
  type WakeLockApiLike,
  type WakeLockSentinelLike,
  type VisibilitySource,
} from '../../../src/infrastructure/system/WakeLockAdapter';

class FakeSentinel implements WakeLockSentinelLike {
  released = false;
  private cb: (() => void) | null = null;
  release(): Promise<void> {
    this.released = true;
    this.cb?.();
    return Promise.resolve();
  }
  addEventListener(_t: 'release', cb: () => void): void {
    this.cb = cb;
  }
}

class FakeApi implements WakeLockApiLike {
  requests = 0;
  last: FakeSentinel | null = null;
  request(_t: 'screen'): Promise<WakeLockSentinelLike> {
    this.requests += 1;
    this.last = new FakeSentinel();
    return Promise.resolve(this.last);
  }
}

class FakeVisibility implements VisibilitySource {
  visible = true;
  private cb: (() => void) | null = null;
  isVisible(): boolean {
    return this.visible;
  }
  onChange(cb: () => void): void {
    this.cb = cb;
  }
  goHidden(): void {
    this.visible = false;
    this.cb?.();
  }
  goVisible(): void {
    this.visible = true;
    this.cb?.();
  }
}

describe('WakeLockAdapter', () => {
  it('acquires and releases a screen wake lock', async () => {
    const api = new FakeApi();
    const lock = new WakeLockAdapter(api, new FakeVisibility());
    expect(lock.isSupported()).toBe(true);
    await lock.request();
    expect(lock.isActive()).toBe(true);
    expect(api.requests).toBe(1);
    await lock.release();
    expect(lock.isActive()).toBe(false);
    expect(api.last?.released).toBe(true);
  });

  it('re-acquires when the page returns to the foreground while desired', async () => {
    const api = new FakeApi();
    const vis = new FakeVisibility();
    const lock = new WakeLockAdapter(api, vis);
    await lock.request();
    await api.last!.release();
    expect(lock.isActive()).toBe(false);
    vis.goVisible();
    await Promise.resolve();
    expect(api.requests).toBe(2);
    expect(lock.isActive()).toBe(true);
  });

  it('no-ops safely when unsupported', async () => {
    const lock = new WakeLockAdapter(null, new FakeVisibility());
    expect(lock.isSupported()).toBe(false);
    await lock.request();
    expect(lock.isActive()).toBe(false);
  });
});
