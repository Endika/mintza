import { describe, expect, it } from 'vitest';
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
  return target.textContent.replace(/\s+/g, ' ');
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
