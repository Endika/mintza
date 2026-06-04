import { describe, expect, it } from 'vitest';
import {
  textFromWhisperSegments,
  type WhisperSegment,
} from '../../../src/infrastructure/transcription/whisperSegments';

const seg = (text: string, no_speech_prob: number, avg_logprob: number): WhisperSegment => ({
  text,
  no_speech_prob,
  avg_logprob,
});

describe('textFromWhisperSegments', () => {
  it('drops high no-speech, low-confidence segments', () => {
    const segments = [seg(' Real sentence.', 0.1, -0.3), seg(' Amara.org', 0.92, -1.6)];
    expect(textFromWhisperSegments(segments, 'fallback')).toBe('Real sentence.');
  });

  it('keeps everything when all segments look like speech', () => {
    const segments = [seg(' One.', 0.1, -0.2), seg(' Two.', 0.2, -0.4)];
    expect(textFromWhisperSegments(segments, 'fallback')).toBe('One. Two.');
  });

  it('falls back to the plain text when there are no segments', () => {
    expect(textFromWhisperSegments(undefined, 'fallback text')).toBe('fallback text');
  });
});
