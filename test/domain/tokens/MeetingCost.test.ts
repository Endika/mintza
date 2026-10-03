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
    expect(meetingCost(pricedMeeting()).llm.get('openai')!.toUsd()).toBeCloseTo(2.5 + 0.15, 6);
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
    expect(cost.total.toUsd()).toBeCloseTo(0.006 + 2.5 + 0.15 + 0.15, 6);
  });

  it('keeps old Whisper parts at the Whisper rate and prices new parts at gpt-transcribe', () => {
    const meeting = Meeting.start({ template: Template.work(), language: Language.of('en') });
    const part = (id: string, startMs: number, provider: 'whisper' | 'gpt-transcribe'): void =>
      meeting.appendSegment(
        new TranscriptSegment({
          id,
          startMs,
          endMs: startMs + 60_000,
          text: TranscriptText.of('hello'),
          provider,
        }),
      );
    part('old', 0, 'whisper');
    part('new', 60_000, 'gpt-transcribe');

    const cost = meetingCost(meeting);
    expect(cost.transcription.get('whisper')!.toUsd()).toBeCloseTo(0.006, 6);
    expect(cost.transcription.get('gpt-transcribe')!.toUsd()).toBeCloseTo(0.0045, 6);
    expect(cost.total.toUsd()).toBeCloseTo(0.0105, 6);
  });

  it('charges nothing for a mind map saved without usage', () => {
    const meeting = Meeting.start({ template: Template.work(), language: Language.of('en') });
    meeting.setMindMap(new MindMap(new MindMapNode('root', [])));
    expect(meetingCost(meeting).mindMap.toUsd()).toBe(0);
    expect(meetingCost(meeting).total.toUsd()).toBe(0);
  });

  it('prices a model missing from the table at the provider default instead of nothing', () => {
    const meeting = Meeting.start({ template: Template.work(), language: Language.of('en') });
    meeting.setSummary(
      new Summary({
        kind: 'decisions',
        content: '- ship it',
        tokensIn: MILLION,
        tokensOut: TokenCount.zero(),
        provider: 'anthropic',
        model: 'claude-future-9',
        generatedAt: new Date(),
      }),
    );
    meeting.setMindMap(
      new MindMap(new MindMapNode('root', []), {
        model: 'gpt-future',
        tokensIn: MILLION,
        tokensOut: TokenCount.zero(),
      }),
    );
    const cost = meetingCost(meeting);
    expect(cost.llm.get('anthropic')!.toUsd()).toBeCloseTo(3, 6);
    expect(cost.mindMap.toUsd()).toBeCloseTo(0.15, 6);
  });

  it('prices a summary saved before models were recorded at the model that ran then', () => {
    const unrecorded = (provider: 'anthropic' | 'gemini'): Meeting => {
      const meeting = Meeting.start({ template: Template.work(), language: Language.of('en') });
      meeting.setSummary(
        new Summary({
          kind: 'decisions',
          content: '- ship it',
          tokensIn: MILLION,
          tokensOut: MILLION,
          provider,
          generatedAt: new Date(),
        }),
      );
      return meeting;
    };
    expect(meetingCost(unrecorded('anthropic')).llm.get('anthropic')!.toUsd()).toBeCloseTo(
      3 + 15,
      6,
    );
    expect(meetingCost(unrecorded('gemini')).llm.get('gemini')!.toUsd()).toBeCloseTo(0.1 + 0.4, 6);
  });

  describe('Gemini', () => {
    const geminiMeeting = (model?: string): Meeting => {
      const meeting = Meeting.start({ template: Template.work(), language: Language.of('en') });
      meeting.setSummary(
        new Summary({
          kind: 'decisions',
          content: '- ship it',
          tokensIn: MILLION,
          tokensOut: MILLION,
          provider: 'gemini',
          ...(model ? { model } : {}),
          generatedAt: new Date(),
        }),
      );
      return meeting;
    };

    it('prices the current default model at its own rates', () => {
      expect(
        meetingCost(geminiMeeting('gemini-3.1-flash-lite')).llm.get('gemini')!.toUsd(),
      ).toBeCloseTo(0.25 + 1.5, 6);
    });

    it('keeps pricing meetings summarised with the retired gemini-2.0-flash', () => {
      expect(meetingCost(geminiMeeting('gemini-2.0-flash')).llm.get('gemini')!.toUsd()).toBeCloseTo(
        0.1 + 0.4,
        6,
      );
    });
  });
});
