import { describe, expect, it } from 'vitest';
import { FinalizeMeetingUseCase } from '../../src/application/use-cases/FinalizeMeetingUseCase';
import { Language } from '../../src/domain/language/value-objects/Language';
import { Meeting } from '../../src/domain/meeting/entities/Meeting';
import { Template } from '../../src/domain/meeting/value-objects/Template';
import { SentimentScoreParser } from '../../src/domain/temperature/services/SentimentScoreParser';
import { TranscriptSegment } from '../../src/domain/transcription/entities/TranscriptSegment';
import { TranscriptText } from '../../src/domain/transcription/value-objects/TranscriptText';
import { AppError } from '../../src/shared/errors/AppError';
import { FakeMindMapPort } from '../fakes/FakeMindMapPort';
import { FakeSummarizationPort } from '../fakes/FakeSummarizationPort';
import { InMemoryMeetingRepository } from '../fakes/InMemoryMeetingRepository';

const meetingWith = (text: string): Meeting => {
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

describe('FinalizeMeetingUseCase', () => {
  it('persists meeting twice: after summaries and after mindmap', async () => {
    const summarization = new FakeSummarizationPort({ kind: 'success', content: 'ok' });
    const mindMap = new FakeMindMapPort({ kind: 'success', rootLabel: 'topic' });
    const repo = new InMemoryMeetingRepository();
    const useCase = new FinalizeMeetingUseCase(
      summarization,
      mindMap,
      repo,
      new SentimentScoreParser(),
    );

    const meeting = meetingWith('hello team');
    const output = await useCase.execute({
      meeting,
      kinds: ['bullet_points', 'action_items'],
    });

    expect(output.summarySuccessCount).toBe(2);
    expect(output.summaryFailureCount).toBe(0);
    expect(output.mindMap?.root.label).toBe('topic');
    expect(output.saveError).toBeUndefined();
    expect(repo.saves).toHaveLength(2);
    const stored = await repo.findById(meeting.id);
    expect(stored.ok && stored.value?.summaries.size).toBe(2);
    expect(stored.ok && stored.value?.mindMap?.root.label).toBe('topic');
  });

  it('derives temperature from sentiment summary content', async () => {
    const summarization = new FakeSummarizationPort({
      kind: 'success',
      content: 'Mood: warm. Score: 0.65',
    });
    const mindMap = new FakeMindMapPort({ kind: 'success', rootLabel: 'topic' });
    const repo = new InMemoryMeetingRepository();
    const useCase = new FinalizeMeetingUseCase(
      summarization,
      mindMap,
      repo,
      new SentimentScoreParser(),
    );

    const meeting = meetingWith('we are aligned');
    await useCase.execute({ meeting, kinds: ['sentiment'] });

    expect(meeting.temperature?.value).toBeCloseTo(0.65);
  });

  it('surfaces saveError when first save fails and skips mindmap', async () => {
    const summarization = new FakeSummarizationPort({ kind: 'success', content: 'ok' });
    const mindMap = new FakeMindMapPort({ kind: 'success', rootLabel: 'topic' });
    const repo = new InMemoryMeetingRepository();
    repo.failNextSave(new AppError('STORAGE_FAILED', 'quota'));
    const useCase = new FinalizeMeetingUseCase(
      summarization,
      mindMap,
      repo,
      new SentimentScoreParser(),
    );

    const meeting = meetingWith('hello');
    const output = await useCase.execute({ meeting, kinds: ['bullet_points'] });

    expect(output.saveError?.code).toBe('STORAGE_FAILED');
    expect(output.mindMap).toBeUndefined();
    expect(mindMap.calls).toHaveLength(0);
  });

  it('returns mindMapError without aborting earlier work', async () => {
    const summarization = new FakeSummarizationPort({ kind: 'success', content: 'ok' });
    const mindMap = new FakeMindMapPort({
      kind: 'failure',
      code: 'SUMMARIZATION_FAILED',
      message: 'boom',
    });
    const repo = new InMemoryMeetingRepository();
    const useCase = new FinalizeMeetingUseCase(
      summarization,
      mindMap,
      repo,
      new SentimentScoreParser(),
    );

    const meeting = meetingWith('hello');
    const output = await useCase.execute({ meeting, kinds: ['bullet_points'] });

    expect(output.summarySuccessCount).toBe(1);
    expect(output.mindMapError?.message).toBe('boom');
    expect(repo.saves).toHaveLength(1);
    const stored = await repo.findById(meeting.id);
    expect(stored.ok && stored.value?.summaries.size).toBe(1);
  });
});
