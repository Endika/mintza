import { describe, expect, it } from 'vitest';
import { Language } from '../../../src/domain/language/value-objects/Language';

describe('Language', () => {
  it('exposes the canonical code', () => {
    expect(Language.of('en').code).toBe('en');
  });

  it('rejects unsupported codes', () => {
    expect(() => Language.of('fr' as 'en')).toThrow();
  });

  it.each([
    ['es-ES', 'es'],
    ['ES_ar', 'es'],
    ['en-US', 'en'],
    ['eu', 'eu'],
    ['fr-FR', 'en'],
    ['ja', 'en'],
  ])('maps navigator value %s to %s', (raw, expected) => {
    expect(Language.fromBrowser(raw).code).toBe(expected);
  });

  it('defaults to Spanish', () => {
    expect(Language.default().code).toBe('es');
  });

  it('treats equal codes as equal', () => {
    expect(Language.of('en').equals(Language.of('en'))).toBe(true);
    expect(Language.of('en').equals(Language.of('es'))).toBe(false);
  });
});
