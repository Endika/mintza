import { describe, expect, it } from 'vitest';
import { metaLine } from '../../src/presentation/util/metaLine';

const render = (parts: string[]): HTMLElement => {
  const host = document.createElement('div');
  host.innerHTML = metaLine(parts);
  return host.firstElementChild as HTMLElement;
};

describe('metaLine', () => {
  it('wraps the values in a row with no separator characters', () => {
    const row = render(['3 Oct 2026', '42 min', 'Work']);
    expect(row.classList.contains('meta-line')).toBe(true);
    expect([...row.children].map((c) => c.textContent)).toEqual(['3 Oct 2026', '42 min', 'Work']);
    expect(row.textContent).not.toContain('·');
  });

  it('lets a long value wrap inside itself instead of overflowing', () => {
    const row = render(['A very long custom template name that never ends']);
    expect(row.firstElementChild!.className).toContain('break-words');
    expect(row.firstElementChild!.className).not.toContain('whitespace-nowrap');
  });

  it('escapes each value', () => {
    const row = render(['<img src=x>']);
    expect(row.querySelector('img')).toBeNull();
    expect(row.textContent).toBe('<img src=x>');
  });
});
