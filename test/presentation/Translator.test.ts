import { describe, expect, it } from 'vitest';
import { Translator } from '../../src/presentation/i18n/Translator';

describe('Translator', () => {
  it('fills named placeholders', () => {
    const t = new Translator('en');
    expect(t.t('home.summaries_result', { ok: 7, failed: 1 })).toBe('7 ready · 1 failed');
  });
  it('speaks Euskara for the same key', () => {
    const t = new Translator('eu');
    expect(t.t('home.summaries_result', { ok: 7, failed: 1 })).toBe('7 prest · 1 hutsegite');
  });
});
