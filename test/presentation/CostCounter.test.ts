import { describe, expect, it } from 'vitest';
import { Language } from '../../src/domain/language/value-objects/Language';
import { Meeting } from '../../src/domain/meeting/entities/Meeting';
import { Template } from '../../src/domain/meeting/value-objects/Template';
import { TranscriptSegment } from '../../src/domain/transcription/entities/TranscriptSegment';
import type { TranscriptionProviderName } from '../../src/domain/transcription/value-objects/TranscriptionProvider';
import { TranscriptText } from '../../src/domain/transcription/value-objects/TranscriptText';
import { CostCounter } from '../../src/presentation/components/CostCounter';
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
    expect(liveCost(recording('webspeech', 60))).toBe('Cost so far: —');
    expect(liveCost(recording('whisper', 1))).toBe('Cost so far: —');
  });

  it('shows the amount once there is one', () => {
    expect(liveCost(recording('whisper', 60))).toBe('Cost so far: $0.006');
  });
});
