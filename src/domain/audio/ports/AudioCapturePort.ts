import type { AudioChunk } from '../value-objects/AudioChunk';

export type AudioChunkHandler = (chunk: AudioChunk) => void;
export type Unsubscribe = () => void;

export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

export interface StopOutcome {
  /** The recorder never confirmed the stop in time; the last seconds may be missing. */
  readonly timedOut: boolean;
}

export interface AudioCapturePort {
  start(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<StopOutcome>;
  state(): RecordingState;
  getStream(): MediaStream | null;
  onChunk(handler: AudioChunkHandler): Unsubscribe;
}
