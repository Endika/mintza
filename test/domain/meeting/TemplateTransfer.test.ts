import { describe, expect, it } from 'vitest';
import {
  parseTemplates,
  serializeTemplates,
} from '../../../src/domain/meeting/services/TemplateTransfer';
import type { TemplateDefinition } from '../../../src/domain/meeting/value-objects/Template';

const def = (id: string): TemplateDefinition => ({
  id,
  name: `Template ${id}`,
  builtIn: false,
  systemRole: 'Role',
  mindMapStructure: 'Structure',
  summaryKinds: ['decisions', 'action_items'],
  featuredOrder: ['action_items'],
  kindLabels: { decisions: 'Calls' },
  promptOverrides: { action_items: 'List tasks.' },
});

const reasonOf = (text: string): string | undefined => {
  const result = parseTemplates(text);
  return result.ok ? undefined : result.error.reason;
};

describe('TemplateTransfer', () => {
  it('writes a versioned envelope without builtIn', () => {
    const parsed = JSON.parse(serializeTemplates([def('a')])) as Record<string, unknown>;
    expect(parsed['format']).toBe('mintza-templates');
    expect(parsed['version']).toBe(1);
    const [first] = parsed['templates'] as Record<string, unknown>[];
    expect(first).not.toHaveProperty('builtIn');
    expect(first).toHaveProperty('id', 'a');
  });

  it('round-trips serialize to parse', () => {
    const input = [def('a'), def('b')];
    const result = parseTemplates(serializeTemplates(input));
    expect(result).toEqual({ ok: true, value: input });
  });

  it('accepts a bare template and a bare array', () => {
    expect(parseTemplates(JSON.stringify(def('a')))).toEqual({ ok: true, value: [def('a')] });
    expect(parseTemplates(JSON.stringify([def('a'), def('b')]))).toEqual({
      ok: true,
      value: [def('a'), def('b')],
    });
  });

  it('drops unknown summary kinds', () => {
    const text = JSON.stringify([{ ...def('a'), summaryKinds: ['decisions', 'bogus'] }]);
    expect(parseTemplates(text)).toEqual({
      ok: true,
      value: [{ ...def('a'), summaryKinds: ['decisions'] }],
    });
  });

  it.each([
    ['not json', 'import_not_json'],
    ['"text"', 'import_wrong_format'],
    ['null', 'import_wrong_format'],
    [JSON.stringify({ format: 'other', version: 1, templates: [] }), 'import_wrong_format'],
    [JSON.stringify({ format: 'mintza-templates', version: 1 }), 'import_wrong_format'],
    [
      JSON.stringify({ format: 'mintza-templates', version: 2, templates: [def('a')] }),
      'import_unsupported_version',
    ],
    [
      JSON.stringify({ format: 'mintza-templates', version: 1, templates: [{}] }),
      'import_wrong_format',
    ],
    ['[]', 'import_empty'],
    [JSON.stringify([{ ...def('a'), id: ' ' }]), 'import_wrong_format'],
    [JSON.stringify([{ ...def('a'), name: '' }]), 'import_wrong_format'],
    [JSON.stringify([{ ...def('a'), systemRole: '  ' }]), 'import_wrong_format'],
    [JSON.stringify([def('a'), { id: 'broken' }]), 'import_wrong_format'],
  ])('rejects %s with %s', (text, reason) => {
    expect(reasonOf(text)).toBe(reason);
  });
});
