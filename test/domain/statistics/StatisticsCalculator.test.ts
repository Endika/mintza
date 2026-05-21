import { describe, expect, it } from 'vitest';
import { Language } from '../../../src/domain/language/value-objects/Language';
import { Meeting } from '../../../src/domain/meeting/entities/Meeting';
import { Template } from '../../../src/domain/meeting/value-objects/Template';
import { StatisticsCalculator } from '../../../src/domain/statistics/services/StatisticsCalculator';
import { TranscriptSegment } from '../../../src/domain/transcription/entities/TranscriptSegment';
import { TranscriptText } from '../../../src/domain/transcription/value-objects/TranscriptText';

describe('StatisticsCalculator', () => {
  const calc = new StatisticsCalculator();

  const meetingWith = (texts: string[], providers: Array<'whisper' | 'google'> = ['whisper']): Meeting => {
    const start = new Date('2026-05-21T10:00:00Z');
    const end = new Date('2026-05-21T10:02:00Z');
    const meeting = Meeting.start({
      template: Template.generic(),
      language: Language.of('en'),
      now: start,
    });
    texts.forEach((text, index) => {
      const provider = providers[index % providers.length] ?? 'whisper';
      meeting.appendSegment(
        new TranscriptSegment({
          id: `${index}`,
          startMs: index * 30_000,
          endMs: index * 30_000 + 30_000,
          text: TranscriptText.of(text),
          provider,
        }),
      );
    });
    meeting.finish(end);
    return meeting;
  };

  it('computes duration, words and words per minute', () => {
    const meeting = meetingWith(['ten words to satisfy the average per minute calculation today']);
    const stats = calc.calculate(meeting);
    expect(stats.durationMs).toBe(120_000);
    expect(stats.wordCount).toBe(10);
    expect(stats.wordsPerMinute).toBeCloseTo(5, 1);
  });

  it('collects every unique provider used', () => {
    const meeting = meetingWith(['hello', 'world'], ['whisper', 'google']);
    const stats = calc.calculate(meeting);
    expect(new Set(stats.providersUsed)).toEqual(new Set(['whisper', 'google']));
  });

  it('ranks keywords excluding stopwords and short tokens', () => {
    const meeting = meetingWith([
      'budget budget budget review status review review todo todo planning planning planning planning',
    ]);
    const stats = calc.calculate(meeting);
    expect(stats.topKeywords[0]?.term).toBe('planning');
    expect(stats.topKeywords[0]?.count).toBe(4);
    expect(stats.topKeywords.map((k) => k.term)).not.toContain('the');
  });
});
