import { describe, expect, it } from 'vitest';
import { modelLabel } from '../../../src/presentation/components/providerLabels';

describe('modelLabel', () => {
  it('names current and legacy models', () => {
    expect(modelLabel('gpt-6-luna')).toBe('GPT-6 Luna');
    expect(modelLabel('gemini-2.0-flash')).toBe('Gemini 2.0 Flash');
  });

  it('falls back to the raw id for an unknown model', () => {
    expect(modelLabel('mystery-9')).toBe('mystery-9');
  });
});
