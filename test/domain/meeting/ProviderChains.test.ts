import { describe, expect, it } from 'vitest';
import {
  SUMMARY_CHAINS,
  TRANSCRIPTION_CHAINS,
  firstUsableSummary,
  firstUsableTranscription,
  googleSpeechKey,
} from '../../../src/domain/meeting/services/ProviderChains';

describe('chain tables', () => {
  it('pins the transcription fallback order per profile', () => {
    expect(TRANSCRIPTION_CHAINS).toEqual({
      cheap: ['google', 'gpt-transcribe'],
      balanced: ['gpt-transcribe', 'google'],
      premium: ['gpt-transcribe', 'azure'],
    });
  });

  it('pins the summary fallback order per profile', () => {
    expect(SUMMARY_CHAINS).toEqual({
      cheap: ['gemini', 'anthropic', 'openai'],
      balanced: ['openai', 'anthropic', 'gemini'],
      premium: ['openai-reasoning'],
    });
  });
});

describe('firstUsableSummary', () => {
  it('is undefined without keys', () => {
    expect(firstUsableSummary(SUMMARY_CHAINS.balanced, {})).toBeUndefined();
  });

  it('skips unconfigured providers down the chain', () => {
    expect(firstUsableSummary(SUMMARY_CHAINS.balanced, { anthropic: 'k' })).toBe('anthropic');
  });

  it('prefers the first configured provider', () => {
    expect(firstUsableSummary(SUMMARY_CHAINS.balanced, { openai: 'o', anthropic: 'a' })).toBe(
      'openai',
    );
  });

  it('uses the Google key for Gemini on cheap', () => {
    expect(firstUsableSummary(SUMMARY_CHAINS.cheap, { google: 'g', openai: 'o' })).toBe('gemini');
  });

  it('ignores empty and blank keys', () => {
    expect(
      firstUsableSummary(SUMMARY_CHAINS.balanced, { openai: '', anthropic: '  ', google: 'g' }),
    ).toBe('gemini');
  });

  it('has no fallback for premium without an OpenAI key', () => {
    expect(
      firstUsableSummary(SUMMARY_CHAINS.premium, { anthropic: 'a', google: 'g' }),
    ).toBeUndefined();
    expect(firstUsableSummary(SUMMARY_CHAINS.premium, { openai: 'o' })).toBe('openai-reasoning');
  });
});

describe('firstUsableTranscription', () => {
  it('is undefined without keys', () => {
    expect(firstUsableTranscription(TRANSCRIPTION_CHAINS.cheap, {})).toBeUndefined();
  });

  it('uses a legacy Google key for Speech', () => {
    expect(firstUsableTranscription(TRANSCRIPTION_CHAINS.cheap, { google: 'legacy' })).toBe(
      'google',
    );
  });

  it('does not use an AQ. Google key for Speech', () => {
    expect(
      firstUsableTranscription(TRANSCRIPTION_CHAINS.cheap, { google: 'AQ.abc' }),
    ).toBeUndefined();
    expect(
      firstUsableTranscription(TRANSCRIPTION_CHAINS.cheap, { google: 'AQ.abc', openai: 'o' }),
    ).toBe('gpt-transcribe');
  });

  it('prefers the dedicated Speech key', () => {
    expect(
      firstUsableTranscription(TRANSCRIPTION_CHAINS.cheap, { google: 'AQ.abc', googleSpeech: 's' }),
    ).toBe('google');
  });

  it('falls to Azure on premium without OpenAI', () => {
    expect(firstUsableTranscription(TRANSCRIPTION_CHAINS.premium, { azure: 'z' })).toBe('azure');
  });
});

describe('googleSpeechKey', () => {
  it('returns the dedicated key over the Gemini one', () => {
    expect(googleSpeechKey({ googleSpeech: 's', google: 'g' })).toBe('s');
  });

  it('treats an empty dedicated key as absent', () => {
    expect(googleSpeechKey({ googleSpeech: '', google: 'g' })).toBe('g');
  });
});
