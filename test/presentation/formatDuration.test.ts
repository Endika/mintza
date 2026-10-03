import { describe, expect, it } from 'vitest';
import { formatDuration } from '../../src/presentation/util/formatDuration';

describe('formatDuration', () => {
  it('reads minutes and seconds instead of raw seconds', () =>
    expect(formatDuration(1834, 'en')).toBe('30 min 34 s'));
  it('switches to hours past an hour', () => expect(formatDuration(3720, 'es')).toBe('1 h 02 min'));
  it('keeps short recordings in seconds', () => expect(formatDuration(45, 'eu')).toBe('45 s'));
  it('pads seconds under a minute count', () =>
    expect(formatDuration(65, 'en')).toBe('1 min 05 s'));
  it('drops the seconds on a whole minute', () =>
    expect(formatDuration(2520, 'en')).toBe('42 min'));
  it('never shows a negative or fractional duration', () => {
    expect(formatDuration(-3, 'en')).toBe('0 s');
    expect(formatDuration(59.9, 'en')).toBe('59 s');
  });
});
