import { describe, expect, it } from 'vitest';
import { sanitizeTemplate } from '../../../src/domain/meeting/services/TemplateSanitizer';
import { SUMMARY_KINDS } from '../../../src/domain/summary/value-objects/SummaryKind';

const valid = {
  id: 'standup',
  name: 'Standup',
  systemRole: 'You summarize standups.',
  mindMapStructure: 'Topics',
  summaryKinds: ['decisions', 'nope'],
  featuredOrder: ['decisions'],
  kindLabels: { decisions: 'Calls' },
  promptOverrides: { decisions: 'List calls.' },
};

describe('sanitizeTemplate', () => {
  it.each([null, 'text', 3, [], {}, { ...valid, id: 4 }, { ...valid, summaryKinds: 'x' }])(
    'rejects %j',
    (raw) => {
      expect(sanitizeTemplate(raw)).toBeNull();
    },
  );

  it('returns a custom definition without unknown kinds', () => {
    expect(sanitizeTemplate(valid)).toEqual({
      ...valid,
      builtIn: false,
      summaryKinds: ['decisions'],
    });
  });

  it('tolerates missing label and override records', () => {
    const { kindLabels: _l, promptOverrides: _p, ...bare } = valid;
    expect(sanitizeTemplate(bare)).toMatchObject({ kindLabels: {}, promptOverrides: {} });
  });

  it('falls back to every summary kind when none is recognised', () => {
    const result = sanitizeTemplate({ ...valid, summaryKinds: ['nope'] });
    expect(result?.summaryKinds).toEqual(SUMMARY_KINDS);
  });
});
