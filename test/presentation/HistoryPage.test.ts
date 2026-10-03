import { afterEach, describe, expect, it } from 'vitest';
import { ClearMeetingsUseCase } from '../../src/application/use-cases/ClearMeetingsUseCase';
import { DeleteMeetingUseCase } from '../../src/application/use-cases/DeleteMeetingUseCase';
import { GetMeetingUseCase } from '../../src/application/use-cases/GetMeetingUseCase';
import { ListMeetingsUseCase } from '../../src/application/use-cases/ListMeetingsUseCase';
import { SaveMeetingUseCase } from '../../src/application/use-cases/SaveMeetingUseCase';
import { Translator } from '../../src/presentation/i18n/Translator';
import { HistoryPage } from '../../src/presentation/pages/HistoryPage';
import { InMemoryMeetingRepository } from '../fakes/InMemoryMeetingRepository';
import { finishedMeeting, settle } from './meetingFixtures';

const renderHistory = async (
  repo: InMemoryMeetingRepository,
): Promise<{ root: HTMLElement; repo: InMemoryMeetingRepository }> => {
  const page = new HistoryPage({
    listMeetings: new ListMeetingsUseCase(repo),
    getMeeting: new GetMeetingUseCase(repo),
    saveMeeting: new SaveMeetingUseCase(repo),
    deleteMeeting: new DeleteMeetingUseCase(repo),
    clearMeetings: new ClearMeetingsUseCase(repo),
    translator: new Translator('en'),
  });
  const root = document.createElement('div');
  document.body.appendChild(root);
  await page.render(root);
  return { root, repo };
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('HistoryPage', () => {
  it('offers to record a first meeting when there are none', async () => {
    const { root } = await renderHistory(new InMemoryMeetingRepository());

    const cta = root.querySelector<HTMLAnchorElement>('#list a[href="#/"]');
    expect(cta?.textContent).toContain('Record a meeting');
    expect(root.textContent).toContain('Your meetings will appear here.');
    expect(root.querySelector('#filters')!.classList.contains('hidden')).toBe(true);
    expect(root.querySelector('#clear-row')!.classList.contains('hidden')).toBe(true);
  });

  it('labels the search and reads each meeting in words', async () => {
    const repo = new InMemoryMeetingRepository();
    await repo.save(finishedMeeting({ title: 'Budget review', seconds: 1834 }));
    const { root } = await renderHistory(repo);

    const search = root.querySelector<HTMLInputElement>('#search')!;
    expect(search.type).toBe('search');
    expect(root.querySelector(`label[for="${search.id}"]`)?.textContent).toBe('Search meetings');
    expect(root.querySelector(`label[for="sort"]`)?.textContent).toBe('Sort');
    const row = root.querySelector('#list li')!;
    expect(row.querySelector('h2')?.textContent).toBe('Budget review');
    expect(row.textContent).toContain('30 min 34 s');
    expect(row.textContent).toContain('Work');
    expect(row.querySelector('[data-delete]')?.getAttribute('aria-label')).toBe(
      'Delete Budget review',
    );
  });

  it('stars a meeting and keeps it starred', async () => {
    const repo = new InMemoryMeetingRepository();
    const meeting = finishedMeeting({ title: 'Standup', seconds: 300 });
    await repo.save(meeting);
    const { root } = await renderHistory(repo);

    const star = root.querySelector<HTMLButtonElement>('[data-star]')!;
    expect(star.getAttribute('aria-pressed')).toBe('false');
    expect(star.getAttribute('aria-label')).toBe('Star Standup');
    star.click();
    await settle();

    expect(root.querySelector('[data-star]')?.getAttribute('aria-pressed')).toBe('true');
    const saved = await repo.findById(meeting.id);
    expect(saved.ok && saved.value?.starred).toBe(true);
  });

  it('returns focus to the page heading after deleting a row', async () => {
    const repo = new InMemoryMeetingRepository();
    await repo.save(finishedMeeting({ title: 'Old sync', seconds: 120 }));
    await repo.save(finishedMeeting({ title: 'New sync', seconds: 60 }));
    const { root } = await renderHistory(repo);
    const original = Object.getOwnPropertyDescriptor(window, 'confirm');
    Object.defineProperty(window, 'confirm', { value: () => true, configurable: true });
    try {
      const del = root.querySelector<HTMLButtonElement>('[data-delete]')!;
      del.focus();
      del.click();
      await settle();
    } finally {
      if (original) Object.defineProperty(window, 'confirm', original);
      else Reflect.deleteProperty(window, 'confirm');
    }

    expect(root.querySelectorAll('#list li')).toHaveLength(1);
    // happy-dom focuses any element; real browsers need the tabindex on a direct load.
    expect(root.querySelector('h1')?.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(root.querySelector('h1'));
  });

  it('escapes meeting titles in the row and its button labels', async () => {
    const repo = new InMemoryMeetingRepository();
    await repo.save(finishedMeeting({ title: '<img src=x onerror=alert(1)>', seconds: 45 }));
    const { root } = await renderHistory(repo);

    expect(root.querySelector('#list img')).toBeNull();
    expect(root.querySelector('#list h2')?.textContent).toBe('<img src=x onerror=alert(1)>');
  });
});
