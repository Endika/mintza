import { describe, expect, it } from 'vitest';
import { TranscribeChunkUseCase } from '../../src/application/use-cases/TranscribeChunkUseCase';
import type {
  TranscriptionPort,
  TranscriptionRequest,
} from '../../src/domain/transcription/ports/TranscriptionPort';
import { AudioChunk } from '../../src/domain/audio/value-objects/AudioChunk';
import { TranscriptSegment } from '../../src/domain/transcription/entities/TranscriptSegment';
import { TranscriptText } from '../../src/domain/transcription/value-objects/TranscriptText';
import { Language } from '../../src/domain/language/value-objects/Language';
import { Meeting } from '../../src/domain/meeting/entities/Meeting';
import { Template } from '../../src/domain/meeting/value-objects/Template';
import { ok, type Result } from '../../src/shared/result/Result';
import type { AppError } from '../../src/shared/errors/AppError';

class SpyTranscription implements TranscriptionPort {
  calls = 0;
  constructor(private readonly text = 'real speech') {}
  transcribe(req: TranscriptionRequest): Promise<Result<TranscriptSegment, AppError>> {
    this.calls += 1;
    return Promise.resolve(
      ok(
        new TranscriptSegment({
          id: 'seg',
          startMs: req.chunk.startMs,
          endMs: req.chunk.endMs,
          text: TranscriptText.of(this.text),
          provider: 'whisper',
        }),
      ),
    );
  }
}

const meeting = (): Meeting =>
  Meeting.start({ template: Template.work(), language: Language.of('en') });
const chunk = (peakLevel: number): AudioChunk =>
  new AudioChunk({
    blob: new Blob(['x'], { type: 'audio/webm' }),
    startMs: 0,
    endMs: 15000,
    mimeType: 'audio/webm',
    peakLevel,
  });

describe('TranscribeChunkUseCase silence skipping', () => {
  it('skips a near-silent chunk without calling transcription', async () => {
    const port = new SpyTranscription();
    const m = meeting();
    const result = await new TranscribeChunkUseCase(port).execute({
      meeting: m,
      chunk: chunk(0.001),
    });
    expect(port.calls).toBe(0);
    expect(result.ok && result.value).toBeNull();
    expect(m.segments).toHaveLength(0);
  });

  it('transcribes and appends a voiced chunk', async () => {
    const port = new SpyTranscription();
    const m = meeting();
    const result = await new TranscribeChunkUseCase(port).execute({
      meeting: m,
      chunk: chunk(0.3),
    });
    expect(port.calls).toBe(1);
    expect(result.ok && result.value?.text.value).toBe('real speech');
    expect(m.segments).toHaveLength(1);
  });

  it('skips a chunk whose transcription is a pure hallucination', async () => {
    const port = new SpyTranscription('Subtitles by the Amara.org community');
    const m = meeting();
    const result = await new TranscribeChunkUseCase(port).execute({
      meeting: m,
      chunk: chunk(0.3),
    });
    expect(result.ok && result.value).toBeNull();
    expect(m.segments).toHaveLength(0);
  });
});
