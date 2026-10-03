import { describe, expect, it } from 'vitest';
import { TOKENS, type Theme } from '../../src/presentation/styles/tokens';
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
});

it('index.css declares exactly the token values in tokens.ts', () => {
  const css = readFileSync('src/presentation/styles/index.css', 'utf8');
  for (const [name, value] of Object.entries(TOKENS.light))
    expect(css).toContain(`--color-${name}: ${value};`);
  for (const [name, value] of Object.entries(TOKENS.dark))
    expect(css).toContain(`--color-${name}: ${value};`);
});
