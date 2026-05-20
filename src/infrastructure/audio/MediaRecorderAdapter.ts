import type {
  AudioCapturePort,
  AudioChunkHandler,
  RecordingState,
  Unsubscribe,
} from '../../domain/audio/ports/AudioCapturePort';
import { AudioChunk } from '../../domain/audio/value-objects/AudioChunk';
import { AppError } from '../../shared/errors/AppError';

const DEFAULT_TIMESLICE_MS = 30_000;
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
  private startedAtMs = 0;
  private elapsedAtPauseMs = 0;
  private status: RecordingState = 'idle';
  private readonly handlers: Set<AudioChunkHandler> = new Set();
  private readonly timesliceMs: number;

  constructor(options: MediaRecorderAdapterOptions = {}) {
    this.timesliceMs = options.timesliceMs ?? DEFAULT_TIMESLICE_MS;
  }

  state(): RecordingState {
    return this.status;
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

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    this.recorder = new MediaRecorder(this.stream, { mimeType });
    this.startedAtMs = performance.now();
    this.elapsedAtPauseMs = 0;
    this.recorder.ondataavailable = (event) => this.emit(event, mimeType);
    this.recorder.start(this.timesliceMs);
    this.status = 'recording';
  }

  pause(): Promise<void> {
    if (this.status !== 'recording' || !this.recorder) return Promise.resolve();
    this.recorder.pause();
    this.elapsedAtPauseMs += performance.now() - this.startedAtMs;
    this.status = 'paused';
    return Promise.resolve();
  }

  resume(): Promise<void> {
    if (this.status !== 'paused' || !this.recorder) return Promise.resolve();
    this.recorder.resume();
    this.startedAtMs = performance.now();
    this.status = 'recording';
    return Promise.resolve();
  }

  stop(): Promise<void> {
    if (this.status === 'idle' || this.status === 'stopped') return Promise.resolve();
    if (this.recorder && this.recorder.state !== 'inactive') {
      this.recorder.stop();
    }
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.recorder = null;
    this.status = 'stopped';
    return Promise.resolve();
  }

  private emit(event: BlobEvent, mimeType: string): void {
    if (event.data.size === 0) return;
    const now = performance.now();
    const endMs = Math.floor(this.elapsedAtPauseMs + (now - this.startedAtMs));
    const startMs = Math.max(0, endMs - this.timesliceMs);
    const chunk = new AudioChunk({
      blob: event.data,
      startMs,
      endMs,
      mimeType,
    });
    this.handlers.forEach((handler) => handler(chunk));
  }
}

const pickSupportedMimeType = (): string | null => {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const candidate of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  return null;
};
