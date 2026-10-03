import 'fake-indexeddb/auto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { App } from '../../src/App';
import { IndexedDBMeetingRepository } from '../../src/infrastructure/persistence/IndexedDBMeetingRepository';
import { Template } from '../../src/domain/meeting/value-objects/Template';
import { UpdateBanner } from '../../src/presentation/components/UpdateBanner';
import { Translator } from '../../src/presentation/i18n/Translator';
import { finishedMeeting, settle } from './meetingFixtures';

const LIVE = '[role="status"], [role="alert"], [aria-live]';

/** Problems that keep a live region out of the accessibility tree, or announce it twice. */
const problems = (scope: ParentNode): string[] =>
  [...scope.querySelectorAll<HTMLElement>(LIVE)].flatMap((el) => {
    const name = `#${el.id || el.tagName.toLowerCase()}`;
    const found: string[] = [];
    if (el.hidden) found.push(`${name} has the hidden attribute`);
    for (const token of el.classList) {
      if (/(^|:)hidden$/.test(token)) found.push(`${name} uses ${token}`);
    }
    if (el.getAttribute('role') === 'status' && el.hasAttribute('aria-live')) {
      found.push(`${name} repeats aria-live on role=status`);
    }
    return found;
  });

const go = async (hash: string): Promise<void> => {
  window.location.hash = hash;
  window.dispatchEvent(new HashChangeEvent('hashchange'));
  for (let i = 0; i < 5; i++) await settle();
};

describe('live regions', () => {
  let meetingId = '';

  beforeAll(async () => {
    window.localStorage.clear();
    window.localStorage.setItem(
      'mintza:config:v1',
      JSON.stringify({ language: 'en', apiKeys: { openai: 'sk-test' } }),
    );
    const meeting = finishedMeeting({
      title: 'Retro',
      seconds: 600,
      transcript: 'We kept the budget flat.',
      summaries: { decisions: '- keep it flat' },
    });
    meetingId = meeting.id.value;
    await new IndexedDBMeetingRepository(globalThis.indexedDB, () =>
      Promise.resolve(Template.work()),
    ).save(meeting);
    const host = document.createElement('div');
    document.body.appendChild(host);
    window.location.hash = '#/';
    await new App(host).start();
    for (let i = 0; i < 5; i++) await settle();
  });

  afterAll(() => {
    document.body.innerHTML = '';
    window.location.hash = '';
    window.localStorage.clear();
  });

  it.each(['#/', '#/history', '#/settings', '#/templates', 'meeting'])(
    'stay in the accessibility tree while empty on %s',
    async (hash) => {
      await go(hash === 'meeting' ? `#/meeting?id=${meetingId}` : hash);

      const main = document.querySelector('main')!;
      expect(main.querySelectorAll(LIVE).length).toBeGreaterThan(0);
      expect(problems(main)).toEqual([]);
    },
  );

  it('stay in the accessibility tree while empty in the template editor', async () => {
    await go('#/templates');
    document.querySelector<HTMLButtonElement>('#btn-new')!.click();
    await settle();

    const editor = document.querySelector<HTMLElement>('#editor')!;
    expect(editor.querySelector('#form-error')).not.toBeNull();
    expect(problems(editor)).toEqual([]);
  });

  it('do not repeat aria-live on the update banner', () => {
    document.querySelector('main')!.replaceChildren();
    const banner = new UpdateBanner();
    banner.show(() => undefined, new Translator('en'));

    expect(problems(document.body)).toEqual([]);
    banner.hide();
  });
});
