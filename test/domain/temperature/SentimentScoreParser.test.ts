import { describe, expect, it } from 'vitest';
import { SentimentScoreParser } from '../../../src/domain/temperature/services/SentimentScoreParser';

describe('SentimentScoreParser', () => {
  const parser = new SentimentScoreParser();

  it('extracts the score from a sentiment summary', () => {
    const score = parser.parse('The meeting was very productive.\nScore: 78');
    expect(score?.value).toBe(78);
  });

  it('clamps out-of-range scores', () => {
    expect(parser.parse('Score: 150')?.value).toBe(100);
    expect(parser.parse('Score: -10')?.value).toBe(0);
  });

  it('returns null when the score is missing', () => {
    expect(parser.parse('Just a description without a score.')).toBeNull();
  });

  it('accepts decimal scores', () => {
    expect(parser.parse('Score: 42.5')?.value).toBe(42.5);
  });
});
