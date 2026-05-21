import { describe, expect, it } from 'vitest';
import { StopRecordingUseCase } from '../../src/application/use-cases/StopRecordingUseCase';
import type {
  AudioCapturePort,
  AudioChunkHandler,
  RecordingState,
  Unsubscribe,
} from '../../src/domain/audio/ports/AudioCapturePort';
import { AudioChunk } from '../../src/domain/audio/value-objects/AudioChunk';
import { Language } from '../../src/domain/language/value-objects/Language';
import { Meeting } from '../../src/domain/meeting/entities/Meeting';
import { Template } from '../../src/domain/meeting/value-objects/Template';
import { TranscriptSegment } from '../../src/domain/transcription/entities/TranscriptSegment';
import { TranscriptText } from '../../src/domain/transcription/value-objects/TranscriptText';

class FakeAudio implements AudioCapturePort {
  private status: RecordingState = 'recording';
  private handler: AudioChunkHandler | null = null;
  pendingFinalChunk: AudioChunk | null = null;

  start(): Promise<void> {
    this.status = 'recording';
    return Promise.resolve();
  }
  pause(): Promise<void> {
    this.status = 'paused';
    return Promise.resolve();
  }
  resume(): Promise<void> {
    this.status = 'recording';
    return Promise.resolve();
  }
  stop(): Promise<void> {
    if (this.pendingFinalChunk && this.handler) {
      this.handler(this.pendingFinalChunk);
      this.pendingFinalChunk = null;
    }
    this.status = 'stopped';
    return Promise.resolve();
  }
  state(): RecordingState {
    return this.status;
  }
  getStream(): MediaStream | null {
    return null;
  }
  onChunk(handler: AudioChunkHandler): Unsubscribe {
    this.handler = handler;
    return () => {
      if (this.handler === handler) this.handler = null;
    };
  }
}

const aChunk = (): AudioChunk =>
  new AudioChunk({
    blob: new Blob(['x'], { type: 'audio/webm' }),
    startMs: 0,
    endMs: 1000,
    mimeType: 'audio/webm',
  });

describe('StopRecordingUseCase', () => {
  it('awaits flushPending before finishing the meeting so the last chunk can be appended', async () => {
    const audio = new FakeAudio();
    const meeting = Meeting.start({
      template: Template.work(),
      language: Language.of('en'),
    });
    audio.pendingFinalChunk = aChunk();

    const pending: Promise<void>[] = [];
    audio.onChunk((chunk) => {
      const p = (async () => {
        // simulate the round-trip of TranscribeChunkUseCase
        await Promise.resolve();
        meeting.appendSegment(
          new TranscriptSegment({
            id: 'late',
            startMs: chunk.startMs,
            endMs: chunk.endMs,
            text: TranscriptText.of('final words'),
            provider: 'whisper',
          }),
        );
      })();
      pending.push(p);
    });

    const useCase = new StopRecordingUseCase(audio);
    const result = await useCase.execute({
      meeting,
      flushPending: () => Promise.allSettled(pending),
    });

    expect(result.ok).toBe(true);
    expect(meeting.isFinished).toBe(true);
    expect(meeting.segments.map((s) => s.text.value)).toContain('final words');
  });

  it('finishes the meeting even when no flushPending callback is provided', async () => {
    const audio = new FakeAudio();
    const meeting = Meeting.start({
      template: Template.work(),
      language: Language.of('en'),
    });

    const useCase = new StopRecordingUseCase(audio);
    const result = await useCase.execute({ meeting });

    expect(result.ok).toBe(true);
    expect(meeting.isFinished).toBe(true);
  });
});
