import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync('src/presentation/styles/index.css', 'utf8');

const block = (opener: string): string => {
  const start = css.indexOf(opener);
  expect(start).toBeGreaterThanOrEqual(0);
  let depth = 0;
  for (let i = css.indexOf('{', start); i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}' && --depth === 0) return css.slice(start, i + 1);
  }
  throw new Error(`unclosed ${opener}`);
};

describe('index.css', () => {
  it('reserves the docked Record strip when the page scrolls a focused control into view', () => {
    expect(block('html:has(.home-wrap[data-docked])')).toContain('scroll-padding-bottom');
  });

  it('pins Record only once the page has docked it, so the page decides and not a media query', () => {
    const dock = block('.home-wrap > .record-dock {');
    expect(dock).toContain('fixed');
    expect(dock).not.toContain('max-md:');
  });
});
