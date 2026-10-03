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
  it('names the transcription model OpenAI runs now in every language', () => {
    for (const language of ['en', 'es', 'eu'] as const) {
      const helper = new Translator(language).t('settings.use_openai');
      expect(helper).toContain('GPT Transcribe');
      expect(helper).not.toContain('Whisper');
    }
  });
});
