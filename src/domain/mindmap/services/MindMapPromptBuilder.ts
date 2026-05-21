import type { Language } from '../../language/value-objects/Language';
import type { Template } from '../../meeting/value-objects/Template';
import type { TranscriptText } from '../../transcription/value-objects/TranscriptText';

export interface MindMapPrompt {
  readonly system: string;
  readonly user: string;
}

const LANGUAGE_NAMES: Record<string, string> = {
  es: 'Spanish',
  en: 'English',
  eu: 'Basque',
};

const TEMPLATE_STRUCTURE: Record<string, string> = {
  work: 'Meeting → Objectives, Decisions, Actions, Blockers, Next steps',
  interview: 'Candidate → Strengths, Areas to improve, Experience, Cultural fit, Recommendation',
  generic: 'Central topic → Subtopics, Ideas, Actions',
};

export class MindMapPromptBuilder {
  build(input: {
    template: Template;
    language: Language;
    transcript: TranscriptText;
  }): MindMapPrompt {
    const langName = LANGUAGE_NAMES[input.language.code] ?? 'English';
    const structure = TEMPLATE_STRUCTURE[input.template.kind] ?? TEMPLATE_STRUCTURE['generic'];
    const system =
      `You are an expert at structuring meeting transcripts into hierarchical mind maps. ` +
      `Reply ONLY with valid JSON, no markdown fences, no commentary. ` +
      `Node labels must be in ${langName}.`;
    const user = [
      `Suggested structure: ${structure ?? ''}.`,
      'Adapt the structure to the actual content of the transcript.',
      'Use 2-3 levels deep. Keep labels under 6 words.',
      '',
      'Schema:',
      '{',
      '  "label": "root label",',
      '  "children": [',
      '    { "label": "branch", "children": [ { "label": "leaf", "children": [] } ] }',
      '  ]',
      '}',
      '',
      `Transcript:\n"""\n${input.transcript.value}\n"""`,
    ].join('\n');
    return { system, user };
  }
}
