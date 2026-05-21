import { describe, expect, it } from 'vitest';
import { AudioChunk } from '../../../src/domain/audio/value-objects/AudioChunk';
import { Language } from '../../../src/domain/language/value-objects/Language';
import { TranscriptionChainAdapter } from '../../../src/infrastructure/transcription/TranscriptionChainAdapter';
import { FakeTranscriptionPort } from '../../fakes/FakeTranscriptionPort';

const chunk = new AudioChunk({
  blob: new Blob([new Uint8Array([0])], { type: 'audio/webm' }),
  startMs: 0,
  endMs: 30_000,
  mimeType: 'audio/webm',
});

const request = { chunk, language: Language.of('en') };

describe('TranscriptionChainAdapter', () => {
  it('returns the first successful provider', async () => {
    const a = new FakeTranscriptionPort({ kind: 'success', text: 'A', provider: 'whisper' });
    const b = new FakeTranscriptionPort({ kind: 'success', text: 'B', provider: 'google' });
    const chain = new TranscriptionChainAdapter(() => [
      { name: 'Whisper', port: a },
      { name: 'Google Speech', port: b },
    ]);
    const result = await chain.transcribe(request);
    expect(result.ok && result.value.provider).toBe('whisper');
    expect(b.calls).toHaveLength(0);
  });

  it('falls back on recoverable errors', async () => {
    const a = new FakeTranscriptionPort({
      kind: 'failure',
      code: 'NETWORK_ERROR',
      message: 'down',
    });
    const b = new FakeTranscriptionPort({ kind: 'success', text: 'rescue', provider: 'google' });
    const chain = new TranscriptionChainAdapter(() => [
      { name: 'Whisper', port: a },
      { name: 'Google Speech', port: b },
    ]);
    const result = await chain.transcribe(request);
    expect(result.ok && result.value.provider).toBe('google');
  });

  it('stops on non recoverable errors and exposes the attempt list', async () => {
    const a = new FakeTranscriptionPort({
      kind: 'failure',
      code: 'TRANSCRIPTION_FAILED',
      message: 'bad audio',
    });
    const b = new FakeTranscriptionPort({ kind: 'success', text: 'unused', provider: 'google' });
    const chain = new TranscriptionChainAdapter(() => [
      { name: 'Whisper', port: a },
      { name: 'Google Speech', port: b },
    ]);
    const result = await chain.transcribe(request);
    expect(result.ok).toBe(false);
    expect(b.calls).toHaveLength(0);
    if (!result.ok) {
      expect(result.error.attempts).toHaveLength(1);
      expect(result.error.attempts[0]?.provider).toBe('Whisper');
      expect(result.error.attempts[0]?.message).toBe('bad audio');
    }
  });
});
