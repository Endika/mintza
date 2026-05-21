import { describe, expect, it } from 'vitest';
import { Language } from '../../../src/domain/language/value-objects/Language';
import { Meeting } from '../../../src/domain/meeting/entities/Meeting';
import { MeetingExporter } from '../../../src/domain/meeting/services/MeetingExporter';
import { Template } from '../../../src/domain/meeting/value-objects/Template';
import { Summary } from '../../../src/domain/summary/entities/Summary';
import { TokenCount } from '../../../src/domain/tokens/value-objects/TokenCount';
import { TranscriptSegment } from '../../../src/domain/transcription/entities/TranscriptSegment';
import { TranscriptText } from '../../../src/domain/transcription/value-objects/TranscriptText';

const buildMeeting = (): Meeting => {
  const meeting = Meeting.start({
    template: Template.generic(),
    language: Language.of('en'),
    title: 'Q1 review',
    now: new Date('2026-05-21T10:00:00Z'),
  });
  meeting.appendSegment(
    new TranscriptSegment({
      id: 's1',
      startMs: 0,
      endMs: 30_000,
      text: TranscriptText.of('Hello world.'),
      provider: 'whisper',
    }),
  );
  meeting.setSummary(
    new Summary({
      kind: 'one_liner',
      content: 'A short meeting.',
      tokensIn: TokenCount.of(20),
      tokensOut: TokenCount.of(5),
      provider: 'openai',
      generatedAt: new Date('2026-05-21T10:00:10Z'),
    }),
  );
  meeting.finish(new Date('2026-05-21T10:00:30Z'));
  return meeting;
};

describe('MeetingExporter', () => {
  const exporter = new MeetingExporter();

  it('produces a markdown file with title, metadata and segments', () => {
    const file = exporter.export(buildMeeting(), 'markdown');
    expect(file.filename).toBe('q1-review.md');
    expect(file.content).toContain('# Q1 review');
    expect(file.content).toContain('Hello world.');
    expect(file.content).toContain('A short meeting.');
  });

  it('produces a JSON file with full structure', () => {
    const file = exporter.export(buildMeeting(), 'json');
    const parsed = JSON.parse(file.content) as { summaries: Record<string, { content: string }> };
    expect(parsed.summaries['one_liner']?.content).toBe('A short meeting.');
  });

  it('escapes CSV cells that contain commas, quotes or newlines', () => {
    const meeting = Meeting.start({
      template: Template.generic(),
      language: Language.of('en'),
      now: new Date('2026-05-21T10:00:00Z'),
    });
    meeting.appendSegment(
      new TranscriptSegment({
        id: 's1',
        startMs: 0,
        endMs: 1000,
        text: TranscriptText.of('hello, "world"'),
        provider: 'whisper',
      }),
    );
    meeting.finish(new Date('2026-05-21T10:00:05Z'));
    const file = exporter.export(meeting, 'csv');
    expect(file.content).toContain('"hello, ""world"""');
  });
});
