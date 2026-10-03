import { describe, expect, it } from 'vitest';
import { Language } from '../../../src/domain/language/value-objects/Language';
import { Meeting } from '../../../src/domain/meeting/entities/Meeting';
import { Template } from '../../../src/domain/meeting/value-objects/Template';
import { MindMap } from '../../../src/domain/mindmap/entities/MindMap';
import { MindMapNode } from '../../../src/domain/mindmap/value-objects/MindMapNode';
import { Summary } from '../../../src/domain/summary/entities/Summary';
import { meetingCost } from '../../../src/domain/tokens/services/MeetingCost';
import { TokenCount } from '../../../src/domain/tokens/value-objects/TokenCount';
import { TranscriptSegment } from '../../../src/domain/transcription/entities/TranscriptSegment';
import { TranscriptText } from '../../../src/domain/transcription/value-objects/TranscriptText';

const MILLION = TokenCount.of(1_000_000);

const pricedMeeting = (): Meeting => {
  const meeting = Meeting.start({ template: Template.work(), language: Language.of('en') });
  meeting.setSummary(
    new Summary({
      kind: 'decisions',
      content: '- ship it',
      tokensIn: MILLION,
      tokensOut: TokenCount.zero(),
      provider: 'openai',
      model: 'gpt-4o',
      generatedAt: new Date(),
    }),
  );
  meeting.setSummary(
    new Summary({
      kind: 'bullet_points',
      content: '- saved before models were recorded',
      tokensIn: MILLION,
      tokensOut: TokenCount.zero(),
      provider: 'openai',
      generatedAt: new Date(),
    }),
  );
  meeting.setMindMap(
    new MindMap(new MindMapNode('root', []), {
      model: 'gpt-4o-mini',
      tokensIn: MILLION,
      tokensOut: TokenCount.zero(),
    }),
  );
  return meeting;
};

describe('meetingCost', () => {
  it('prices a premium summary at gpt-4o rates and an old one at the fallback', () => {
    expect(meetingCost(pricedMeeting()).llm.get('openai')!.toUsd()).toBeCloseTo(5 + 0.15, 6);
  });

  it('counts the mind map call', () => {
    expect(meetingCost(pricedMeeting()).mindMap.toUsd()).toBeCloseTo(0.15, 6);
  });

  it('adds everything into the total', () => {
    const meeting = pricedMeeting();
    meeting.appendSegment(
      new TranscriptSegment({
        id: 's1',
        startMs: 0,
        endMs: 60_000,
        text: TranscriptText.of('hello'),
        provider: 'whisper',
      }),
    );
    const cost = meetingCost(meeting);
    expect(cost.transcription.get('whisper')!.toUsd()).toBeCloseTo(0.006, 6);
    expect(cost.total.toUsd()).toBeCloseTo(0.006 + 5 + 0.15 + 0.15, 6);
  });

  it('charges nothing for a mind map saved without usage', () => {
    const meeting = Meeting.start({ template: Template.work(), language: Language.of('en') });
    meeting.setMindMap(new MindMap(new MindMapNode('root', [])));
    expect(meetingCost(meeting).mindMap.toUsd()).toBe(0);
    expect(meetingCost(meeting).total.toUsd()).toBe(0);
  });
});
