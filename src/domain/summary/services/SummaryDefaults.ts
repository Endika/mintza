import type { SummaryKind } from '../value-objects/SummaryKind';

export const DEFAULT_LABELS: Record<SummaryKind, string> = {
  bullet_points: 'Key points',
  action_items: 'Action items',
  one_liner: 'One-liner',
  keywords: 'Keywords',
  sentiment: 'Sentiment',
  timeline: 'Timeline',
  decisions: 'Decisions',
  next_steps: 'Next steps',
};

export const DEFAULT_INSTRUCTIONS: Record<SummaryKind, string> = {
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

export const defaultLabelFor = (kind: SummaryKind): string => DEFAULT_LABELS[kind];
export const defaultInstructionFor = (kind: SummaryKind): string => DEFAULT_INSTRUCTIONS[kind];
