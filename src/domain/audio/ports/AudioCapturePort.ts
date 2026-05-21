import type { AudioChunk } from '../value-objects/AudioChunk';

export type AudioChunkHandler = (chunk: AudioChunk) => void;
export type Unsubscribe = () => void;

export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

export interface AudioCapturePort {
  start(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  state(): RecordingState;
  getStream(): MediaStream | null;
  onChunk(handler: AudioChunkHandler): Unsubscribe;
}
