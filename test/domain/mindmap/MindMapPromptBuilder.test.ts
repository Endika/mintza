import { describe, expect, it } from 'vitest';
import { Language } from '../../../src/domain/language/value-objects/Language';
import { Template } from '../../../src/domain/meeting/value-objects/Template';
import { MindMapPromptBuilder } from '../../../src/domain/mindmap/services/MindMapPromptBuilder';
import { TranscriptText } from '../../../src/domain/transcription/value-objects/TranscriptText';

describe('MindMapPromptBuilder', () => {
  const builder = new MindMapPromptBuilder();
  const transcript = TranscriptText.of('sample content');

  it('asks the LLM to reply in the requested language', () => {
    const prompt = builder.build({
      template: Template.work(),
      language: Language.of('eu'),
      transcript,
    });
    expect(prompt.system).toMatch(/Basque/);
  });

  it('mentions the suggested structure for the template', () => {
    const prompt = builder.build({
      template: Template.interview(),
      language: Language.of('en'),
      transcript,
    });
    expect(prompt.user).toMatch(/Candidate/);
  });

  it('embeds the transcript in the user message', () => {
    const prompt = builder.build({
      template: Template.generic(),
      language: Language.of('en'),
      transcript,
    });
    expect(prompt.user).toContain('sample content');
  });
});
