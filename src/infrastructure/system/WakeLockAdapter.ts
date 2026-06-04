import type { ScreenWakePort } from '../../domain/system/ports/ScreenWakePort';

export interface WakeLockSentinelLike {
  release(): Promise<void>;
  addEventListener(type: 'release', cb: () => void): void;
}

export interface WakeLockApiLike {
  request(type: 'screen'): Promise<WakeLockSentinelLike>;
}

export interface VisibilitySource {
  isVisible(): boolean;
  onChange(cb: () => void): void;
}

const browserVisibility = (): VisibilitySource => ({
  isVisible: () => typeof document === 'undefined' || document.visibilityState === 'visible',
  onChange: (cb) => {
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', cb);
  },
});

const browserWakeLock = (): WakeLockApiLike | null => {
  if (typeof navigator === 'undefined') return null;
  const api = (navigator as Navigator & { wakeLock?: WakeLockApiLike }).wakeLock;
  return api ?? null;
};

export class WakeLockAdapter implements ScreenWakePort {
  private sentinel: WakeLockSentinelLike | null = null;
  private desired = false;

  constructor(
    private readonly api: WakeLockApiLike | null = browserWakeLock(),
    visibility: VisibilitySource = browserVisibility(),
  ) {
    visibility.onChange(() => {
      if (this.desired && visibility.isVisible() && !this.sentinel) {
        void this.acquire();
      }
    });
  }

  isSupported(): boolean {
    return this.api !== null;
  }

  isActive(): boolean {
    return this.sentinel !== null;
  }

  async request(): Promise<void> {
    this.desired = true;
    await this.acquire();
  }

  async release(): Promise<void> {
    this.desired = false;
    const sentinel = this.sentinel;
    this.sentinel = null;
    if (sentinel) {
      try {
        await sentinel.release();
      } catch {
        // already released
      }
    }
  }

  private async acquire(): Promise<void> {
    if (!this.api || this.sentinel) return;
    try {
      const sentinel = await this.api.request('screen');
      sentinel.addEventListener('release', () => {
        this.sentinel = null;
      });
      this.sentinel = this.desired ? sentinel : null;
      if (!this.desired) await sentinel.release();
    } catch {
      this.sentinel = null;
    }
  }
}
