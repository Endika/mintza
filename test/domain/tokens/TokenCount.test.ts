import { describe, expect, it } from 'vitest';
import { TokenCount } from '../../../src/domain/tokens/value-objects/TokenCount';

describe('TokenCount', () => {
  it('rejects negative values', () => {
    expect(() => TokenCount.of(-1)).toThrow();
  });

  it('rejects fractional values', () => {
    expect(() => TokenCount.of(1.5)).toThrow();
  });

  it('adds two counts', () => {
    expect(TokenCount.of(10).add(TokenCount.of(7)).value).toBe(17);
  });

  it('estimates ~1 token every four characters', () => {
    expect(TokenCount.estimateFromText('').value).toBe(0);
    expect(TokenCount.estimateFromText('abcd').value).toBe(1);
    expect(TokenCount.estimateFromText('abcde').value).toBe(2);
  });
});
