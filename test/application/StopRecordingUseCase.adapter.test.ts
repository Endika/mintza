import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { StopRecordingUseCase } from '../../src/application/use-cases/StopRecordingUseCase';
import { Language } from '../../src/domain/language/value-objects/Language';
import { Meeting } from '../../src/domain/meeting/entities/Meeting';
import { Template } from '../../src/domain/meeting/value-objects/Template';
import { MediaRecorderAdapter } from '../../src/infrastructure/audio/MediaRecorderAdapter';

class FakeTrack {
  stopped = false;
  stop(): void {
    this.stopped = true;
  }
}

class FakeRecorder {
  static silent = true;
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
    if (!FakeRecorder.silent) queueMicrotask(() => this.onstop?.(new Event('stop')));
  }
}

const track = new FakeTrack();
const stream = { getTracks: () => [track] };
const originalRecorder = Object.getOwnPropertyDescriptor(globalThis, 'MediaRecorder');
const originalDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');

const stopRecording = async (silent: boolean): Promise<boolean | undefined> => {
  FakeRecorder.silent = silent;
  const adapter = new MediaRecorderAdapter({ stopTimeoutMs: 20 });
  await adapter.start();
  const meeting = Meeting.start({ template: Template.work(), language: Language.of('en') });
  const result = await new StopRecordingUseCase(adapter, 5_000).execute({ meeting });
  return result.ok ? result.value.stopTimedOut : undefined;
};

describe('StopRecordingUseCase with the real MediaRecorderAdapter', () => {
  beforeEach(() => {
    track.stopped = false;
    Object.defineProperty(globalThis, 'MediaRecorder', {
      value: FakeRecorder,
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

  it('reports a timeout when the recorder never confirms the stop, and releases the tracks', async () => {
    expect(await stopRecording(true)).toBe(true);
    expect(track.stopped).toBe(true);
  });

  it('reports no timeout when the recorder confirms the stop', async () => {
    expect(await stopRecording(false)).toBe(false);
    expect(track.stopped).toBe(true);
  });
});
