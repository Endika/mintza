import { describe, expect, it } from 'vitest';
import { Language } from '../../src/domain/language/value-objects/Language';
import { Meeting } from '../../src/domain/meeting/entities/Meeting';
import { Template } from '../../src/domain/meeting/value-objects/Template';
import { MindMap } from '../../src/domain/mindmap/entities/MindMap';
import { MindMapNode } from '../../src/domain/mindmap/value-objects/MindMapNode';
import { Summary } from '../../src/domain/summary/entities/Summary';
import type { SummaryKind } from '../../src/domain/summary/value-objects/SummaryKind';
import { TokenCount } from '../../src/domain/tokens/value-objects/TokenCount';
import { TranscriptSegment } from '../../src/domain/transcription/entities/TranscriptSegment';
import type { TranscriptionProviderName } from '../../src/domain/transcription/value-objects/TranscriptionProvider';
import { TranscriptText } from '../../src/domain/transcription/value-objects/TranscriptText';
import { CostCounter } from '../../src/presentation/components/CostCounter';
import { StatisticsPanel } from '../../src/presentation/components/StatisticsPanel';
import { Translator } from '../../src/presentation/i18n/Translator';
import { finishedMeeting } from './meetingFixtures';

const line = (transcript: string, language: 'en' | 'es' | 'eu'): string => {
  const target = document.createElement('div');
  new CostCounter().renderSummaryLine(
    target,
    finishedMeeting({ title: 'Sync', seconds: 60, transcript }),
    new Translator(language),
  );
  return [...target.querySelectorAll('.meta-line > span')].map((s) => s.textContent).join(' | ');
};

describe('CostCounter summary line', () => {
  it('counts a single word in the singular', () => {
    expect(line('hello', 'en')).toMatch(/\b1 word\b/);
    expect(line('hola', 'es')).toMatch(/\b1 palabra\b/);
    expect(line('kaixo', 'eu')).toContain('hitz 1');
  });

  it('keeps the plural for more words', () => {
    expect(line('hello team', 'en')).toContain('2 words');
    expect(line('hola equipo', 'es')).toContain('2 palabras');
    expect(line('kaixo taldea', 'eu')).toContain('2 hitz');
  });
});

const recording = (provider: TranscriptionProviderName, seconds: number): Meeting => {
  const meeting = Meeting.start({ template: Template.work(), language: Language.of('en') });
  meeting.appendSegment(
    new TranscriptSegment({
      id: 's1',
      startMs: 0,
      endMs: seconds * 1000,
      text: TranscriptText.of('hello team'),
      provider,
    }),
  );
  return meeting;
};

const liveCost = (meeting: Meeting): string => {
  const target = document.createElement('div');
  const counter = new CostCounter();
  counter.startLive(target, () => meeting, new Translator('en'));
  counter.stop();
  return target.querySelector('.meta-line > span')!.textContent ?? '';
};

describe('CostCounter live line', () => {
  it('shows a dash until there is a cost to show', () => {
    expect(liveCost(recording('whisper', 1))).toBe('Cost so far: —');
  });

  it('says it is free when only a free provider transcribed', () => {
    expect(liveCost(recording('webspeech', 60))).toBe('Cost so far: Free');
  });

  it('shows the amount once there is one', () => {
    expect(liveCost(recording('whisper', 60))).toBe('Cost so far: $0.006');
  });

  it('counts the words again only when a new part arrives', () => {
    const meeting = recording('whisper', 60);
    const fullText = meeting.fullText.bind(meeting);
    let counted = 0;
    meeting.fullText = () => {
      counted++;
      return fullText();
    };
    const counter = new CostCounter();
    const target = document.createElement('div');
    const translator = new Translator('en');
    counter.startLive(target, () => meeting, translator);
    counter.startLive(target, () => meeting, translator);
    counter.startLive(target, () => meeting, translator);
    expect(counted).toBe(1);

    meeting.appendSegment(
      new TranscriptSegment({
        id: 's2',
        startMs: 60_000,
        endMs: 70_000,
        text: TranscriptText.of('and more'),
        provider: 'whisper',
      }),
    );
    counter.startLive(target, () => meeting, translator);
    counter.stop();
    expect(counted).toBe(2);
    expect(target.textContent).toContain('4 words');
  });
});

const kindLabel = (kind: SummaryKind): string => `<${kind}>`;

describe('transcription labels name the model that ran', () => {
  const breakdownLabels = (meeting: Meeting): string[] => {
    const target = document.createElement('div');
    new CostCounter().renderBreakdown(target, meeting, new Translator('en'), kindLabel);
    return [...target.querySelectorAll('dt')].map((dt) => dt.textContent ?? '');
  };

  const providersStat = (meeting: Meeting): string => {
    const target = document.createElement('div');
    new StatisticsPanel().render(target, meeting, new Translator('en'));
    return target.querySelectorAll('dd')[3]?.textContent ?? '';
  };

  it('keeps calling an old meeting Whisper', () => {
    const meeting = recording('whisper', 60);
    expect(breakdownLabels(meeting)).toEqual(['Whisper', 'Total']);
    expect(providersStat(meeting)).toBe('Whisper');
  });

  it('calls a new meeting GPT Transcribe', () => {
    const meeting = recording('gpt-transcribe', 60);
    expect(breakdownLabels(meeting)).toEqual(['GPT Transcribe', 'Total']);
    expect(providersStat(meeting)).toBe('GPT Transcribe');
  });
});

describe('LLM rows name the model and what it wrote', () => {
  const summarised = (
    ...parts: [SummaryKind, 'openai' | 'anthropic' | 'gemini', string?][]
  ): Meeting => {
    const meeting = Meeting.start({ template: Template.work(), language: Language.of('en') });
    for (const [kind, provider, model] of parts) {
      meeting.setSummary(
        new Summary({
          kind,
          content: '- x',
          tokensIn: TokenCount.of(1_000_000),
          tokensOut: TokenCount.zero(),
          provider,
          ...(model ? { model } : {}),
          generatedAt: new Date(),
        }),
      );
    }
    return meeting;
  };

  const rows = (meeting: Meeting): string[][] => {
    const target = document.createElement('div');
    new CostCounter().renderBreakdown(target, meeting, new Translator('en'), kindLabel);
    return [...target.querySelectorAll('dl > div')].map((row) => [
      row.querySelector('dt')!.textContent ?? '',
      row.querySelector('dd')!.textContent ?? '',
    ]);
  };

  it('lists the summaries a model wrote beside its name and cost', () => {
    const meeting = summarised(
      ['action_items', 'gemini', 'gemini-3.1-flash-lite'],
      ['decisions', 'gemini', 'gemini-3.1-flash-lite'],
      ['bullet_points', 'anthropic', 'claude-sonnet-5-5'],
      ['one_liner', 'openai', 'gpt-6-luna'],
    );
    expect(rows(meeting)).toEqual([
      ['Claude Sonnet 5.5 · <bullet_points>', '$2.000'],
      ['Gemini 3.1 Flash Lite · <action_items>, <decisions>', '$0.500'],
      ['GPT-6 Luna · <one_liner>', '$0.100'],
      ['Total', '$2.600'],
    ]);
  });

  it('shows the provider when the model was never recorded', () => {
    expect(rows(summarised(['decisions', 'gemini']))[0]).toEqual([
      'Gemini · <decisions>',
      '$0.100',
    ]);
  });

  it('leaves out a summary that cost nothing', () => {
    const meeting = summarised(['decisions', 'openai', 'gpt-6-luna']);
    meeting.setSummary(
      new Summary({
        kind: 'action_items',
        content: '- x',
        tokensIn: TokenCount.zero(),
        tokensOut: TokenCount.zero(),
        provider: 'gemini',
        model: 'gemini-3.1-flash-lite',
        generatedAt: new Date(),
      }),
    );
    expect(rows(meeting).map(([label]) => label)).toEqual(['GPT-6 Luna · <decisions>', 'Total']);
  });

  it('names the model behind the mind map', () => {
    const meeting = summarised();
    meeting.setMindMap(
      new MindMap(new MindMapNode('root', []), {
        model: 'gpt-4o',
        tokensIn: TokenCount.of(1_000_000),
        tokensOut: TokenCount.zero(),
      }),
    );
    expect(rows(meeting)[0]).toEqual(['Mind map · GPT-4o', '$2.500']);
  });

  it('leaves out a mind map that cost nothing', () => {
    const meeting = summarised(['decisions', 'openai', 'gpt-6-luna']);
    meeting.setMindMap(
      new MindMap(new MindMapNode('root', []), {
        model: 'gpt-6-luna',
        tokensIn: TokenCount.zero(),
        tokensOut: TokenCount.zero(),
      }),
    );
    expect(rows(meeting).map(([label]) => label)).toEqual(['GPT-6 Luna · <decisions>', 'Total']);
  });
});
