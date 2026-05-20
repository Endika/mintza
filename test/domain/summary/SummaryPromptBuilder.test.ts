import { describe, expect, it } from 'vitest';
import { Language } from '../../../src/domain/language/value-objects/Language';
import { Template } from '../../../src/domain/meeting/value-objects/Template';
import { SummaryPromptBuilder } from '../../../src/domain/summary/services/SummaryPromptBuilder';
import { TranscriptText } from '../../../src/domain/transcription/value-objects/TranscriptText';

describe('SummaryPromptBuilder', () => {
  const builder = new SummaryPromptBuilder();
  const transcript = TranscriptText.of('Sample transcript content.');

  it('asks the LLM to reply in the requested language', () => {
    const prompt = builder.build({
      kind: 'bullet_points',
      template: Template.work(),
      language: Language.of('es'),
      transcript,
    });
    expect(prompt.system).toMatch(/Spanish/);
  });

  it('embeds the template name into the system prompt', () => {
    const prompt = builder.build({
      kind: 'one_liner',
      template: Template.interview(),
      language: Language.of('en'),
      transcript,
    });
    expect(prompt.system).toMatch(/job interview/);
  });

  it('puts the transcript verbatim in the user message', () => {
    const prompt = builder.build({
      kind: 'keywords',
      template: Template.generic(),
      language: Language.of('en'),
      transcript,
    });
    expect(prompt.user).toContain('Sample transcript content.');
  });

  it('uses a kind-specific instruction', () => {
    const decisions = builder.build({
      kind: 'decisions',
      template: Template.generic(),
      language: Language.of('en'),
      transcript,
    });
    const oneLiner = builder.build({
      kind: 'one_liner',
      template: Template.generic(),
      language: Language.of('en'),
      transcript,
    });
    expect(decisions.user).not.toEqual(oneLiner.user);
  });
});
