import { describe, expect, it } from 'vitest';
import { Language } from '../../../src/domain/language/value-objects/Language';
import { Template } from '../../../src/domain/meeting/value-objects/Template';
import { TranscriptText } from '../../../src/domain/transcription/value-objects/TranscriptText';
import { SummarizationChainAdapter } from '../../../src/infrastructure/llm/SummarizationChainAdapter';
import { FakeSummarizationPort } from '../../fakes/FakeSummarizationPort';

const request = {
  kind: 'bullet_points' as const,
  transcript: TranscriptText.of('something'),
  template: Template.generic(),
  language: Language.of('en'),
};

describe('SummarizationChainAdapter', () => {
  it('returns the first successful provider response', async () => {
    const primary = new FakeSummarizationPort({ kind: 'success', content: 'first' });
    const secondary = new FakeSummarizationPort({ kind: 'success', content: 'second' });
    const chain = new SummarizationChainAdapter(() => [
      { name: 'A', port: primary },
      { name: 'B', port: secondary },
    ]);
    const result = await chain.summarize(request);
    expect(result.ok && result.value.content).toBe('first');
    expect(secondary.calls).toHaveLength(0);
  });

  it('falls back when the first provider returns a recoverable error', async () => {
    const primary = new FakeSummarizationPort({
      kind: 'failure',
      code: 'API_KEY_INVALID',
      message: 'no key',
    });
    const secondary = new FakeSummarizationPort({
      kind: 'success',
      content: 'second',
      provider: 'anthropic',
    });
    const chain = new SummarizationChainAdapter(() => [
      { name: 'Gemini', port: primary },
      { name: 'Claude', port: secondary },
    ]);
    const result = await chain.summarize(request);
    expect(result.ok && result.value.provider).toBe('anthropic');
    expect(secondary.calls).toHaveLength(1);
  });

  it('stops on a non recoverable error and reports attempts', async () => {
    const primary = new FakeSummarizationPort({
      kind: 'failure',
      code: 'SUMMARIZATION_FAILED',
      message: 'bad request',
    });
    const secondary = new FakeSummarizationPort({ kind: 'success', content: 'unused' });
    const chain = new SummarizationChainAdapter(() => [
      { name: 'GPT', port: primary },
      { name: 'Claude', port: secondary },
    ]);
    const result = await chain.summarize(request);
    expect(result.ok).toBe(false);
    expect(secondary.calls).toHaveLength(0);
    if (!result.ok) {
      expect(result.error.attempts).toHaveLength(1);
      expect(result.error.attempts[0]?.provider).toBe('GPT');
    }
  });

  it('returns an error when no providers are configured', async () => {
    const chain = new SummarizationChainAdapter(() => []);
    const result = await chain.summarize(request);
    expect(result.ok).toBe(false);
  });
});
