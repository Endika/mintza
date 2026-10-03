import { expect } from 'vitest';

/** A heading keeps its role only outside <summary>, so result rows use a heading with a button. */
export const expectCollapsibleResult = (
  root: HTMLElement,
  toggle: HTMLButtonElement,
  label: string,
  content: string,
  { region: landmark }: { region: boolean },
): void => {
  expect(toggle.type).toBe('button');
  expect(toggle.parentElement?.tagName).toBe('H3');
  expect(toggle.parentElement?.textContent?.trim()).toBe(label);
  const region = document.getElementById(toggle.getAttribute('aria-controls')!)!;
  expect(root.contains(region)).toBe(true);
  if (landmark) {
    expect(region.getAttribute('role')).toBe('region');
    expect(region.getAttribute('aria-labelledby')).toBe(toggle.id);
  } else {
    expect(region.hasAttribute('role')).toBe(false);
    expect(region.hasAttribute('aria-labelledby')).toBe(false);
  }
  expect(region.textContent).toContain(content);
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  expect(region.hidden).toBe(true);

  toggle.click();
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  expect(region.hidden).toBe(false);

  toggle.click();
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  expect(region.hidden).toBe(true);
};
