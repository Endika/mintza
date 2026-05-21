import type {
  AudioCapturePort,
  AudioChunkHandler,
  RecordingState,
  Unsubscribe,
} from '../../domain/audio/ports/AudioCapturePort';
import { AudioChunk } from '../../domain/audio/value-objects/AudioChunk';
import { AppError } from '../../shared/errors/AppError';

const DEFAULT_TIMESLICE_MS = 15_000;
const PREFERRED_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
];

export interface MediaRecorderAdapterOptions {
  readonly timesliceMs?: number;
}

export class MediaRecorderAdapter implements AudioCapturePort {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private mimeType: string | null = null;
  private status: RecordingState = 'idle';
  private elapsedBeforeCycleMs = 0;
  private rotateTimer: number | null = null;
  private isRotating = false;
  private readonly handlers: Set<AudioChunkHandler> = new Set();
  private readonly timesliceMs: number;

  constructor(options: MediaRecorderAdapterOptions = {}) {
    this.timesliceMs = options.timesliceMs ?? DEFAULT_TIMESLICE_MS;
  }

  state(): RecordingState {
    return this.status;
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  onChunk(handler: AudioChunkHandler): Unsubscribe {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  async start(): Promise<void> {
    if (this.status === 'recording') return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new AppError('RECORDING_NOT_SUPPORTED', 'getUserMedia not available');
    }
    const mimeType = pickSupportedMimeType();
    if (!mimeType) {
      throw new AppError('RECORDING_NOT_SUPPORTED', 'No supported audio codec found');
    }
    this.mimeType = mimeType;
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    this.elapsedBeforeCycleMs = 0;
    this.status = 'recording';
    this.startCycle();
  }

  pause(): Promise<void> {
    if (this.status !== 'recording') return Promise.resolve();
    this.status = 'paused';
    this.clearTimer();
    const recorder = this.recorder;
    if (recorder && recorder.state !== 'inactive') {
      this.isRotating = false;
      recorder.stop();
    }
    return Promise.resolve();
  }

  resume(): Promise<void> {
    if (this.status !== 'paused' || !this.stream) return Promise.resolve();
    this.status = 'recording';
    this.startCycle();
    return Promise.resolve();
  }

  stop(): Promise<void> {
    if (this.status === 'idle' || this.status === 'stopped') return Promise.resolve();
    this.status = 'stopped';
    this.clearTimer();
    this.isRotating = false;
    if (this.recorder && this.recorder.state !== 'inactive') {
      this.recorder.stop();
    }
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.recorder = null;
    this.mimeType = null;
    return Promise.resolve();
  }

  private startCycle(): void {
    if (!this.stream || !this.mimeType) return;
    const recorder = new MediaRecorder(this.stream, { mimeType: this.mimeType });
    const startedAt = performance.now();
    let emitted = false;

    recorder.ondataavailable = (event) => {
      if (event.data.size === 0 || emitted) return;
      emitted = true;
      const elapsedThisCycle = performance.now() - startedAt;
      const endMs = Math.floor(this.elapsedBeforeCycleMs + elapsedThisCycle);
      const startMs = Math.max(0, this.elapsedBeforeCycleMs);
      const chunk = new AudioChunk({
        blob: event.data,
        startMs,
        endMs,
        mimeType: this.mimeType ?? event.data.type,
      });
      this.handlers.forEach((handler) => handler(chunk));
    };

    recorder.onstop = () => {
      this.elapsedBeforeCycleMs += performance.now() - startedAt;
      if (this.isRotating && this.status === 'recording') {
        this.isRotating = false;
        this.startCycle();
      }
    };

    this.recorder = recorder;
    recorder.start();
    this.rotateTimer = window.setTimeout(() => {
      if (this.status === 'recording' && recorder.state === 'recording') {
        this.isRotating = true;
        recorder.stop();
      }
    }, this.timesliceMs);
  }

  private clearTimer(): void {
    if (this.rotateTimer !== null) {
      window.clearTimeout(this.rotateTimer);
      this.rotateTimer = null;
    }
  }
}

const pickSupportedMimeType = (): string | null => {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const candidate of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  return null;
};
