import { describe, expect, it } from 'vitest';
import { sanitizeTemplate } from '../../../src/domain/meeting/services/TemplateSanitizer';
import { SUMMARY_KINDS } from '../../../src/domain/summary/value-objects/SummaryKind';

const valid = {
  id: 'standup',
  name: 'Standup',
  systemRole: 'You summarize standups.',
  mindMapStructure: 'Topics',
  summaryKinds: ['decisions', 'nope'],
  featuredOrder: ['decisions', 'nope'],
  kindLabels: { decisions: 'Calls', bogus: 'x', action_items: '  ' },
  promptOverrides: { decisions: 'List calls.', next_steps: 3 },
};

describe('sanitizeTemplate', () => {
  it.each([
    null,
    'text',
    3,
    [],
    {},
    { ...valid, id: 4 },
    { ...valid, name: 4 },
    { ...valid, systemRole: 1 },
    { ...valid, mindMapStructure: null },
    { ...valid, summaryKinds: 'x' },
  ])('rejects %j', (raw) => {
    expect(sanitizeTemplate(raw)).toBeNull();
  });

  it('returns a custom definition keeping only recognised entries', () => {
    expect(sanitizeTemplate(valid)).toEqual({
      ...valid,
      builtIn: false,
      summaryKinds: ['decisions'],
      featuredOrder: ['decisions'],
      kindLabels: { decisions: 'Calls' },
      promptOverrides: { decisions: 'List calls.' },
    });
  });

  it.each([undefined, null, 'x'])('tolerates %j label and override records', (value) => {
    expect(sanitizeTemplate({ ...valid, kindLabels: value, promptOverrides: value })).toMatchObject(
      { kindLabels: {}, promptOverrides: {} },
    );
  });

  it.each([
    [{ summaryKinds: ['nope'] }, 'summaryKinds', SUMMARY_KINDS],
    [{ featuredOrder: ['nope'] }, 'featuredOrder', ['decisions']],
  ])('falls back when none is recognised in %j', (override, field, expected) => {
    expect(sanitizeTemplate({ ...valid, ...override })?.[field as 'summaryKinds']).toEqual(
      expected,
    );
  });
});
