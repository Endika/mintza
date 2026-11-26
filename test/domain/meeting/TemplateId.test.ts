import { describe, expect, it } from 'vitest';
import { generateTemplateId } from '../../../src/domain/meeting/value-objects/TemplateId';

describe('generateTemplateId', () => {
  it.each([
    ['Reunión Semanal!', 'reunion-semanal-4fzy'],
    ['  --  ', 'tpl-4fzy'],
    ['', 'tpl-4fzy'],
  ])('slugifies %j into %s', (seed, expected) => {
    expect(generateTemplateId(seed, () => 0.123456)).toBe(expected);
  });
});
