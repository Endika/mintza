import { describe, expect, it } from 'vitest';
import { Template } from '../../../src/domain/meeting/value-objects/Template';
import { SUMMARY_KINDS } from '../../../src/domain/summary/value-objects/SummaryKind';

describe('Template', () => {
  it.each(['work', 'interview', 'generic'] as const)(
    '%s template features all 8 summary kinds exactly once',
    (kind) => {
      const order = Template.of(kind).featuredSummaryOrder();
      expect(order).toHaveLength(SUMMARY_KINDS.length);
      expect(new Set(order)).toEqual(new Set(SUMMARY_KINDS));
    },
  );

  it('work template leads with decisions and action items', () => {
    const order = Template.work().featuredSummaryOrder();
    expect(order[0]).toBe('decisions');
    expect(order[1]).toBe('action_items');
  });

  it('interview template leads with sentiment', () => {
    expect(Template.interview().featuredSummaryOrder()[0]).toBe('sentiment');
  });

  it('rejects unknown kinds', () => {
    expect(() => Template.of('unknown' as 'work')).toThrow();
  });
});
