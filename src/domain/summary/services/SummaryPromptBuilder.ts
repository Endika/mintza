import type { Language } from '../../language/value-objects/Language';
import type { Template } from '../../meeting/value-objects/Template';
import type { TranscriptText } from '../../transcription/value-objects/TranscriptText';
import type { SummaryKind } from '../value-objects/SummaryKind';

export interface SummaryPrompt {
  readonly system: string;
  readonly user: string;
}

export interface SummaryPromptInput {
  readonly kind: SummaryKind;
  readonly template: Template;
  readonly language: Language;
  readonly transcript: TranscriptText;
}

export class SummaryPromptBuilder {
  build(input: SummaryPromptInput): SummaryPrompt {
    const langName = LANGUAGE_NAMES[input.language.code];
    const templateName = TEMPLATE_NAMES[input.template.kind];
    const instruction = INSTRUCTIONS[input.kind];
    const system = `You are an expert assistant analyzing a ${templateName}. Reply strictly in ${langName}. Follow the user's instructions literally.`;
    const user = `Transcript:\n"""\n${input.transcript.value}\n"""\n\nTask: ${instruction}`;
    return { system, user };
  }
}

const LANGUAGE_NAMES: Record<string, string> = {
  es: 'Spanish',
  en: 'English',
  eu: 'Basque (Euskara)',
};

const TEMPLATE_NAMES: Record<string, string> = {
  work: 'work meeting',
  interview: 'job interview',
  generic: 'general conversation',
};

const INSTRUCTIONS: Record<SummaryKind, string> = {
  bullet_points:
    'Extract the key points as concise bullets (5 to 10). No introduction. Start directly with the bullets.',
  action_items:
    'Identify the action items. Format: "- [Owner]: [Action]". If there is no clear owner, use "[Unassigned]". Only bullets, no introduction.',
  one_liner:
    'Summarize the whole meeting in a single sentence of at most 25 words. Return only the sentence.',
  keywords:
    'Return 10 to 15 keywords separated by commas. No numbering, no explanation. Only the list.',
  sentiment:
    'Analyze the overall tone and sentiment of the conversation in 2-3 sentences. At the end include a score from 0 to 100 using the exact format "Score: NN".',
  timeline:
    'Build a chronological timeline of the important events. Format: "- [Approximate moment]: [Event]". Only bullets, no introduction.',
  decisions:
    'List the decisions made. Bullet format. If there are no clear decisions, return "No explicit decisions were made".',
  next_steps:
    'Summarize the agreed next actions and follow-up meetings. Bullet format. If there are none, return "No next steps defined".',
};
