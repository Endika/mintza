import type { Template } from '../../domain/meeting/value-objects/Template';
import { SUMMARY_KINDS, type SummaryKind } from '../../domain/summary/value-objects/SummaryKind';

export const orderSummaries = (
  template: Template,
  kinds: readonly SummaryKind[],
): { primary: SummaryKind | undefined; rest: SummaryKind[] } => {
  const featured = template.featuredSummaryOrder().filter((k) => kinds.includes(k));
  const others = SUMMARY_KINDS.filter((k) => kinds.includes(k) && !featured.includes(k));
  const ordered = [...featured, ...others];
  return { primary: ordered[0], rest: ordered.slice(1) };
};
