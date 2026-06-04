import { describe, expect, it } from 'vitest';
import { AudioChunk } from '../../../src/domain/audio/value-objects/AudioChunk';

const blob = (): Blob => new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/webm' });
const base = { blob: new Blob(['x'], { type: 'audio/webm' }), startMs: 0, endMs: 1000, mimeType: 'audio/webm' };

describe('AudioChunk', () => {
  it('exposes timing metadata', () => {
    const chunk = new AudioChunk({
      blob: blob(),
      startMs: 0,
      endMs: 30_000,
      mimeType: 'audio/webm',
    });
    expect(chunk.durationMs).toBe(30_000);
    expect(chunk.mimeType).toBe('audio/webm');
  });

  it('rejects an end time before the start', () => {
    expect(
      () => new AudioChunk({ blob: blob(), startMs: 200, endMs: 100, mimeType: 'audio/webm' }),
    ).toThrow();
  });

  it('allows zero-length chunks', () => {
    const chunk = new AudioChunk({ blob: blob(), startMs: 5, endMs: 5, mimeType: 'audio/webm' });
    expect(chunk.durationMs).toBe(0);
  });
});

describe('AudioChunk.peakLevel', () => {
  it('is undefined by default and carries a provided value', () => {
    expect(new AudioChunk(base).peakLevel).toBeUndefined();
    expect(new AudioChunk({ ...base, peakLevel: 0.42 }).peakLevel).toBe(0.42);
  });
});
