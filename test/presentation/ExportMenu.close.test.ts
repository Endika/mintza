import { afterEach, describe, expect, it } from 'vitest';
import { ExportMenu } from '../../src/presentation/components/ExportMenu';
import { Translator } from '../../src/presentation/i18n/Translator';
import { finishedMeeting, settle } from './meetingFixtures';

const mountOpen = (): { menu: ExportMenu; details: HTMLDetailsElement; target: HTMLElement } => {
  const target = document.createElement('div');
  const outside = document.createElement('p');
  outside.id = 'outside';
  document.body.append(target, outside);
  const meeting = finishedMeeting({ title: 'Sync', seconds: 60, transcript: 'hello team' });
  const menu = new ExportMenu();
  menu.render(target, () => meeting, new Translator('en'));
  const details = target.querySelector<HTMLDetailsElement>('details')!;
  details.open = true;
  return { menu, details, target };
};

describe('ExportMenu closing', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('closes on Escape and returns focus to its button', () => {
    const { menu, details } = mountOpen();

    details.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(details.open).toBe(false);
    expect(document.activeElement).toBe(details.querySelector('summary'));
    menu.dispose();
  });

  it('stays open on other keys', () => {
    const { menu, details } = mountOpen();

    details.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));

    expect(details.open).toBe(true);
    menu.dispose();
  });

  it('closes after a format is chosen, not merely because the download link was clicked', async () => {
    const listening = new AbortController();
    // The download's own anchor click would reach the outside-click handler and close the menu.
    document.addEventListener(
      'click',
      (e) => {
        if (e.target instanceof HTMLAnchorElement) e.stopImmediatePropagation();
      },
      { signal: listening.signal },
    );
    const { menu, details, target } = mountOpen();

    target.querySelector<HTMLButtonElement>('[data-export="txt"]')!.click();
    for (let i = 0; i < 5; i++) await settle();

    expect(details.open).toBe(false);
    menu.dispose();
    listening.abort();
  });

  it('closes on a click outside, and stays open for a click inside', () => {
    const { menu, details } = mountOpen();

    details.querySelector<HTMLElement>('ul')!.click();
    expect(details.open).toBe(true);

    document.getElementById('outside')!.click();
    expect(details.open).toBe(false);
    menu.dispose();
  });
});
