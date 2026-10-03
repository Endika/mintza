import { describe, expect, it } from 'vitest';
import { BADGE_TINT, TOKENS, type Theme } from '../../src/presentation/styles/tokens';
import { readFileSync } from 'node:fs';

const luminance = (hex: string): number => {
  const c = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
};
const ratio = (a: string, b: string): number => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
};
const over = (fg: string, bg: string, alpha: number): string =>
  '#' +
  [1, 3, 5]
    .map((i) => {
      const mixed =
        alpha * parseInt(fg.slice(i, i + 2), 16) + (1 - alpha) * parseInt(bg.slice(i, i + 2), 16);
      return Math.round(mixed).toString(16).padStart(2, '0');
    })
    .join('');

const block = (css: string, opener: string): string => {
  const start = css.indexOf(opener);
  expect(start).toBeGreaterThanOrEqual(0);
  let depth = 0;
  for (let i = css.indexOf('{', start); i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}' && --depth === 0) return css.slice(start, i + 1);
  }
  throw new Error(`unclosed ${opener}`);
};

const TEXT: [string, string][] = [
  ['fg', 'ground'],
  ['fg', 'surface'],
  ['fg-muted', 'ground'],
  ['fg-muted', 'surface'],
  ['on-action', 'action'],
  ['on-action', 'action-hover'],
  ['on-live', 'live'],
  ['danger', 'surface'],
  ['warning', 'surface'],
  ['success', 'surface'],
  ['action', 'surface'],
];
const UI: [string, string][] = [
  ['edge', 'surface'],
  ['edge', 'ground'],
  ['focus', 'ground'],
  ['focus', 'surface'],
  ['live', 'surface'],
  ['action', 'ground'],
];

describe.each(['light', 'dark'] as Theme[])('%s tokens', (theme) => {
  const t = TOKENS[theme];
  it.each(TEXT)('%s on %s reaches 4.5:1', (fg, bg) =>
    expect(ratio(t[fg]!, t[bg]!)).toBeGreaterThanOrEqual(4.5),
  );
  it.each(UI)('%s against %s reaches 3:1', (fg, bg) =>
    expect(ratio(t[fg]!, t[bg]!)).toBeGreaterThanOrEqual(3),
  );
  it.each(['ground', 'surface'])(
    'the recording badge text on its tint over %s reaches 4.5:1',
    (bg) => expect(ratio(t.live!, over(t.live!, t[bg]!, BADGE_TINT))).toBeGreaterThanOrEqual(4.5),
  );
});

describe('index.css', () => {
  const css = readFileSync('src/presentation/styles/index.css', 'utf8');

  it('declares the light tokens in @theme', () => {
    const theme = block(css, '@theme {');
    for (const [name, value] of Object.entries(TOKENS.light))
      expect(theme).toContain(`--color-${name}: ${value};`);
  });

  it('declares the dark tokens in the dark colour-scheme block', () => {
    const dark = block(css, '@media (prefers-color-scheme: dark) {');
    for (const [name, value] of Object.entries(TOKENS.dark))
      expect(dark).toContain(`--color-${name}: ${value};`);
  });

  it('tints the recording badge with the tested alpha', () => {
    expect(block(css, '.rec-badge {')).toContain(`bg-live/${Math.round(BADGE_TINT * 100)} `);
  });
});
