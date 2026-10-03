import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MediaRecorderAdapter } from '../../../src/infrastructure/audio/MediaRecorderAdapter';

class FakeTrack {
  stopped = false;
  stop(): void {
    this.stopped = true;
  }
}

/** A recorder whose stop never reaches onstop, as when the browser drops the event. */
class SilentRecorder {
  static isTypeSupported(): boolean {
    return true;
  }
  state: 'inactive' | 'recording' = 'inactive';
  onstop: ((event: Event) => void) | null = null;
  ondataavailable: ((event: Event) => void) | null = null;
  start(): void {
    this.state = 'recording';
  }
  stop(): void {
    this.state = 'inactive';
  }
}

const track = new FakeTrack();
const stream = { getTracks: () => [track] };
const originalRecorder = Object.getOwnPropertyDescriptor(globalThis, 'MediaRecorder');
const originalDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');

describe('MediaRecorderAdapter', () => {
  beforeEach(() => {
    track.stopped = false;
    Object.defineProperty(globalThis, 'MediaRecorder', {
      value: SilentRecorder,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: () => Promise.resolve(stream) },
      configurable: true,
    });
  });
  afterEach(() => {
    if (originalRecorder) Object.defineProperty(globalThis, 'MediaRecorder', originalRecorder);
    else Reflect.deleteProperty(globalThis, 'MediaRecorder');
    if (originalDevices) Object.defineProperty(navigator, 'mediaDevices', originalDevices);
    else Reflect.deleteProperty(navigator, 'mediaDevices');
  });

  it('releases the microphone even when the recorder never confirms the stop', async () => {
    const adapter = new MediaRecorderAdapter({ stopTimeoutMs: 20 });
    await adapter.start();
    expect(track.stopped).toBe(false);

    await adapter.stop();

    expect(track.stopped).toBe(true);
    expect(adapter.getStream()).toBeNull();
    expect(adapter.state()).toBe('stopped');
  });
});
