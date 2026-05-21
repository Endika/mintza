import { describe, expect, it } from 'vitest';
import { GenerateSummariesUseCase } from '../../src/application/use-cases/GenerateSummariesUseCase';
import { Language } from '../../src/domain/language/value-objects/Language';
import { Meeting } from '../../src/domain/meeting/entities/Meeting';
import { Template } from '../../src/domain/meeting/value-objects/Template';
import { TranscriptSegment } from '../../src/domain/transcription/entities/TranscriptSegment';
import { TranscriptText } from '../../src/domain/transcription/value-objects/TranscriptText';
import { FakeSummarizationPort } from '../fakes/FakeSummarizationPort';

const meetingWithText = (text: string): Meeting => {
  const meeting = Meeting.start({
    template: Template.work(),
    language: Language.of('en'),
    now: new Date('2026-05-21T10:00:00Z'),
  });
  meeting.appendSegment(
    new TranscriptSegment({
      id: 's1',
      startMs: 0,
      endMs: 30_000,
      text: TranscriptText.of(text),
      provider: 'whisper',
    }),
  );
  return meeting;
};

describe('GenerateSummariesUseCase', () => {
  it('runs the port for each requested kind and stores them on the meeting', async () => {
    const port = new FakeSummarizationPort({ kind: 'success', content: 'ok' });
    const useCase = new GenerateSummariesUseCase(port);
    const meeting = meetingWithText('hello team');
    const output = await useCase.execute({
      meeting,
      kinds: ['bullet_points', 'action_items', 'one_liner'],
    });
    expect(output.successCount).toBe(3);
    expect(output.failureCount).toBe(0);
    expect(meeting.summaries.size).toBe(3);
    expect(meeting.summaries.get('bullet_points')?.content).toBe('ok');
  });

  it('records failures without aborting the rest', async () => {
    const port = new FakeSummarizationPort({
      kind: 'failure',
      code: 'SUMMARIZATION_FAILED',
      message: 'boom',
    });
    const useCase = new GenerateSummariesUseCase(port);
    const meeting = meetingWithText('hello');
    const output = await useCase.execute({ meeting, kinds: ['decisions', 'keywords'] });
    expect(output.successCount).toBe(0);
    expect(output.failureCount).toBe(2);
    expect(meeting.summaries.size).toBe(0);
  });
});
