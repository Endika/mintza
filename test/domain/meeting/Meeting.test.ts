import { describe, expect, it } from 'vitest';
import { Language } from '../../../src/domain/language/value-objects/Language';
import { Meeting } from '../../../src/domain/meeting/entities/Meeting';
import { Template } from '../../../src/domain/meeting/value-objects/Template';
import { Summary } from '../../../src/domain/summary/entities/Summary';
import { TemperatureScore } from '../../../src/domain/temperature/value-objects/TemperatureScore';
import { TokenCount } from '../../../src/domain/tokens/value-objects/TokenCount';
import { TranscriptSegment } from '../../../src/domain/transcription/entities/TranscriptSegment';
import { TranscriptText } from '../../../src/domain/transcription/value-objects/TranscriptText';

const buildMeeting = (now = new Date('2026-05-21T10:00:00Z')): Meeting =>
  Meeting.start({ template: Template.generic(), language: Language.of('en'), now });

const buildSegment = (text: string, startMs = 0): TranscriptSegment =>
  new TranscriptSegment({
    id: `${startMs}`,
    startMs,
    endMs: startMs + 30_000,
    text: TranscriptText.of(text),
    provider: 'whisper',
  });

describe('Meeting', () => {
  it('starts unfinished with a generated title', () => {
    const meeting = buildMeeting();
    expect(meeting.isFinished).toBe(false);
    expect(meeting.title.length).toBeGreaterThan(0);
    expect(meeting.segments).toHaveLength(0);
  });

  it('rejects an empty title', () => {
    const meeting = buildMeeting();
    expect(() => meeting.rename('   ')).toThrow();
  });

  it('appends segments while recording', () => {
    const meeting = buildMeeting();
    meeting.appendSegment(buildSegment('hello'));
    meeting.appendSegment(buildSegment('world', 30_000));
    expect(meeting.segments).toHaveLength(2);
    expect(meeting.fullText().value).toBe('hello world');
  });

  it('refuses to append once finished', () => {
    const meeting = buildMeeting();
    meeting.finish(new Date('2026-05-21T10:01:00Z'));
    expect(() => meeting.appendSegment(buildSegment('late'))).toThrow();
  });

  it('rejects a finish date before the start', () => {
    const meeting = buildMeeting();
    expect(() => meeting.finish(new Date('2026-05-21T09:00:00Z'))).toThrow();
  });

  it('stores summaries indexed by kind', () => {
    const meeting = buildMeeting();
    meeting.setSummary(
      new Summary({
        kind: 'one_liner',
        content: 'short',
        tokensIn: TokenCount.zero(),
        tokensOut: TokenCount.zero(),
        provider: 'openai',
        generatedAt: new Date(),
      }),
    );
    expect(meeting.summaries.get('one_liner')?.content).toBe('short');
  });

  it('stores temperature as a value object', () => {
    const meeting = buildMeeting();
    meeting.setTemperature(TemperatureScore.of(75));
    expect(meeting.temperature?.band()).toBe('positive');
  });

  it('toggles star state', () => {
    const meeting = buildMeeting();
    expect(meeting.starred).toBe(false);
    meeting.toggleStar();
    expect(meeting.starred).toBe(true);
  });

  it('deduplicates tags and lowercases them', () => {
    const meeting = buildMeeting();
    meeting.addTag('Sprint');
    meeting.addTag('SPRINT');
    meeting.addTag('  ');
    expect(meeting.tags).toEqual(['sprint']);
  });
});
