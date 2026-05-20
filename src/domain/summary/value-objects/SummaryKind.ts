export const SUMMARY_KINDS = [
  'bullet_points',
  'action_items',
  'one_liner',
  'keywords',
  'sentiment',
  'timeline',
  'decisions',
  'next_steps',
] as const;

export type SummaryKind = (typeof SUMMARY_KINDS)[number];

export const isSummaryKind = (value: string): value is SummaryKind =>
  (SUMMARY_KINDS as readonly string[]).includes(value);
