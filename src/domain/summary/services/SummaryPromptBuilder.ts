import type { Language } from '../../language/value-objects/Language';
import type { Template } from '../../meeting/value-objects/Template';
import type { TranscriptText } from '../../transcription/value-objects/TranscriptText';
import { defaultInstructionFor } from './SummaryDefaults';
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

const LANGUAGE_NAMES: Record<string, string> = {
  es: 'Spanish',
  en: 'English',
  eu: 'Basque (Euskara)',
};

export class SummaryPromptBuilder {
  build(input: SummaryPromptInput): SummaryPrompt {
    const langName = LANGUAGE_NAMES[input.language.code] ?? 'English';
    const instruction = input.template.promptFor(input.kind, defaultInstructionFor(input.kind));
    const system =
      `You are an expert assistant analyzing ${input.template.systemRole}. ` +
      `Reply strictly in ${langName}. Follow the user's instructions literally.`;
    const user = `Transcript:\n"""\n${input.transcript.value}\n"""\n\nTask: ${instruction}`;
    return { system, user };
  }
}
