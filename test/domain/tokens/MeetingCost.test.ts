import { describe, expect, it } from 'vitest';
import { Language } from '../../../src/domain/language/value-objects/Language';
import { Meeting } from '../../../src/domain/meeting/entities/Meeting';
import { Template } from '../../../src/domain/meeting/value-objects/Template';
import { MindMap } from '../../../src/domain/mindmap/entities/MindMap';
import { MindMapNode } from '../../../src/domain/mindmap/value-objects/MindMapNode';
import type { SummaryKind } from '../../../src/domain/summary/value-objects/SummaryKind';
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
    const costs = meetingCost(pricedMeeting()).llm.map((group) => group.cost.toUsd());
    expect(costs[0]).toBeCloseTo(0.15, 6);
    expect(costs[1]).toBeCloseTo(2.5, 6);
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
    expect(cost.llm[0]!.cost.toUsd()).toBeCloseTo(3, 6);
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
    expect(meetingCost(unrecorded('anthropic')).llm[0]!.cost.toUsd()).toBeCloseTo(3 + 15, 6);
    expect(meetingCost(unrecorded('gemini')).llm[0]!.cost.toUsd()).toBeCloseTo(0.1 + 0.4, 6);
  });

  describe('LLM groups', () => {
    const summarised = (...parts: [SummaryKind, 'openai' | 'gemini', string?][]): Meeting => {
      const meeting = Meeting.start({ template: Template.work(), language: Language.of('en') });
      for (const [kind, provider, model] of parts) {
        meeting.setSummary(
          new Summary({
            kind,
            content: '- x',
            tokensIn: MILLION,
            tokensOut: TokenCount.zero(),
            provider,
            ...(model ? { model } : {}),
            generatedAt: new Date(),
          }),
        );
      }
      return meeting;
    };

    it('joins summaries on the same model into one group with their summed cost', () => {
      const { llm } = meetingCost(
        summarised(
          ['decisions', 'gemini', 'gemini-3.1-flash-lite'],
          ['action_items', 'gemini', 'gemini-3.1-flash-lite'],
        ),
      );
      expect(llm).toHaveLength(1);
      expect(llm[0]).toMatchObject({
        provider: 'gemini',
        model: 'gemini-3.1-flash-lite',
        kinds: ['action_items', 'decisions'],
      });
      expect(llm[0]!.cost.toUsd()).toBeCloseTo(0.5, 6);
    });

    it('splits two models of the same provider', () => {
      const { llm } = meetingCost(
        summarised(['decisions', 'openai', 'gpt-6-luna'], ['action_items', 'openai', 'gpt-4o']),
      );
      expect(llm.map((group) => group.model)).toEqual(['gpt-4o', 'gpt-6-luna']);
    });

    it('groups summaries without a recorded model under their provider at the fallback price', () => {
      const { llm } = meetingCost(
        summarised(
          ['decisions', 'gemini'],
          ['action_items', 'openai'],
          ['bullet_points', 'openai'],
        ),
      );
      expect(llm).toHaveLength(2);
      expect(llm[0]).toMatchObject({
        provider: 'openai',
        kinds: ['bullet_points', 'action_items'],
      });
      expect('model' in llm[0]!).toBe(false);
      expect(llm[0]!.cost.toUsd()).toBeCloseTo(0.3, 6);
      expect(llm[1]!.cost.toUsd()).toBeCloseTo(0.1, 6);
    });
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
      expect(meetingCost(geminiMeeting('gemini-3.1-flash-lite')).llm[0]!.cost.toUsd()).toBeCloseTo(
        0.25 + 1.5,
        6,
      );
    });

    it('keeps pricing meetings summarised with the retired gemini-2.0-flash', () => {
      expect(meetingCost(geminiMeeting('gemini-2.0-flash')).llm[0]!.cost.toUsd()).toBeCloseTo(
        0.1 + 0.4,
        6,
      );
    });
  });
});
