import { afterEach, describe, expect, it } from 'vitest';
import { AppShell } from '../../src/presentation/components/AppShell';
import { Translator } from '../../src/presentation/i18n/Translator';

describe('AppShell', () => {
  afterEach(() => {
    history.replaceState(null, '', window.location.pathname);
  });

  it('marks Record for unknown routes, which fall back to Home', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const shell = new AppShell(document.getElementById('app') as HTMLElement, new Translator('en'));
    shell.setActive('/nowhere');
    const current = document.querySelector('[aria-current="page"]');
    expect(current?.getAttribute('href')).toBe('#/');
  });

  it('marks the tab for the current route, including child routes', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const shell = new AppShell(document.getElementById('app') as HTMLElement, new Translator('es'));
    shell.setActive('/meeting');
    const current = document.querySelector('[aria-current="page"]');
    expect(current?.getAttribute('href')).toBe('#/history');
    expect(current?.textContent?.trim()).toBe('Historial');
  });

  it('takes the navigation out of reach while recording', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const shell = new AppShell(document.getElementById('app') as HTMLElement, new Translator('en'));
    shell.setBusy(true);
    const nav = document.querySelector('nav') as HTMLElement;
    expect(nav.hidden).toBe(true);
    expect(nav.inert).toBe(true);
    shell.setBusy(false);
    expect(nav.hidden).toBe(false);
  });

  it('gives the page a main landmark the router renders into', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const shell = new AppShell(document.getElementById('app') as HTMLElement, new Translator('en'));
    expect(shell.main.tagName).toBe('MAIN');
    expect(shell.main.id).toBe('main');
  });

  it('skips to the content without changing the route', () => {
    document.body.innerHTML = '<div id="app"></div>';
    window.location.hash = '#/settings';
    const shell = new AppShell(document.getElementById('app') as HTMLElement, new Translator('en'));
    const skip = document.querySelector<HTMLAnchorElement>('#app > a')!;
    skip.click();
    expect(window.location.hash).toBe('#/settings');
    expect(document.activeElement).toBe(shell.main);
  });

  it('relabels the tabs after a language change and keeps the current one', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const translator = new Translator('en');
    const shell = new AppShell(document.getElementById('app') as HTMLElement, translator);
    shell.setActive('/templates');
    translator.setLanguage('eu');
    shell.relabel();
    const current = document.querySelector('[aria-current="page"]');
    expect(current?.getAttribute('href')).toBe('#/settings');
    expect(current?.textContent?.trim()).toBe('Ezarpenak');
  });
});
