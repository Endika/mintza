import { describe, expect, it } from 'vitest';
import { HallucinationFilter } from '../../../src/domain/transcription/services/HallucinationFilter';

describe('HallucinationFilter', () => {
  const filter = new HallucinationFilter();

  it('removes known Amara/credit hallucinations', () => {
    expect(filter.clean('Subtítulos realizados por la comunidad de Amara.org')).toBe('');
    expect(filter.clean('Subtitles by the Amara.org community')).toBe('');
    expect(filter.clean('¡Gracias por ver el vídeo!')).toBe('');
  });

  it('keeps real speech, dropping only hallucinated lines', () => {
    const input = 'We agreed on the budget.\nSubtitles by the Amara.org community';
    expect(filter.clean(input)).toBe('We agreed on the budget.');
  });

  it('returns the text unchanged when there is no hallucination', () => {
    expect(filter.clean('Let us start the meeting.')).toBe('Let us start the meeting.');
  });

  it('keeps real speech that merely mentions a blocklisted common word', () => {
    expect(filter.clean('The background music was too loud.')).toBe(
      'The background music was too loud.',
    );
  });

  it('still drops standalone music/applause tags', () => {
    expect(filter.clean('[Music]')).toBe('');
    expect(filter.clean('Aplausos')).toBe('');
  });
});
