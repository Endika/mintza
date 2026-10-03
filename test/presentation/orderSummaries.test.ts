import { describe, expect, it } from 'vitest';
import { Template } from '../../src/domain/meeting/value-objects/Template';
import { orderSummaries } from '../../src/presentation/util/orderSummaries';

describe('orderSummaries', () => {
  it('leads with the work template’s featured result', () => {
    const { primary, rest } = orderSummaries(Template.work(), [
      'bullet_points',
      'decisions',
      'action_items',
    ]);
    expect(primary).toBe('decisions');
    expect(rest).not.toContain('decisions');
    expect(rest).toHaveLength(2);
  });

  it('falls back to the first available kind when the featured one failed', () => {
    expect(orderSummaries(Template.work(), ['keywords']).primary).toBe('keywords');
  });

  it('has no primary when nothing was generated', () => {
    expect(orderSummaries(Template.work(), []).primary).toBeUndefined();
  });
});
