import { describe, expect, it } from 'vitest';
import { TranscriptText } from '../../../src/domain/transcription/value-objects/TranscriptText';

describe('TranscriptText', () => {
  it('trims whitespace on construction', () => {
    expect(TranscriptText.of('   hello   ').value).toBe('hello');
  });

  it('returns zero word count for empty text', () => {
    expect(TranscriptText.empty().wordCount()).toBe(0);
  });

  it('counts words separated by any whitespace', () => {
    expect(TranscriptText.of('one  two\tthree\nfour').wordCount()).toBe(4);
  });

  it('concatenates non empty texts with the given separator', () => {
    const a = TranscriptText.of('hello');
    const b = TranscriptText.of('world');
    expect(a.concat(b).value).toBe('hello world');
    expect(a.concat(b, ' / ').value).toBe('hello / world');
  });

  it('returns the other text when one side is empty', () => {
    const empty = TranscriptText.empty();
    const filled = TranscriptText.of('hi');
    expect(empty.concat(filled).value).toBe('hi');
    expect(filled.concat(empty).value).toBe('hi');
  });
});
