import { afterEach, describe, expect, it } from 'vitest';
import { ClearMeetingsUseCase } from '../../src/application/use-cases/ClearMeetingsUseCase';
import { DeleteMeetingUseCase } from '../../src/application/use-cases/DeleteMeetingUseCase';
import { GetMeetingUseCase } from '../../src/application/use-cases/GetMeetingUseCase';
import { ListMeetingsUseCase } from '../../src/application/use-cases/ListMeetingsUseCase';
import { SaveMeetingUseCase } from '../../src/application/use-cases/SaveMeetingUseCase';
import { Language } from '../../src/domain/language/value-objects/Language';
import type { LanguageCode } from '../../src/domain/language/value-objects/Language';
import { Meeting } from '../../src/domain/meeting/entities/Meeting';
import { Template } from '../../src/domain/meeting/value-objects/Template';
import { SUMMARY_KINDS } from '../../src/domain/summary/value-objects/SummaryKind';
import type { AppError } from '../../src/shared/errors/AppError';
import { ok, type Result } from '../../src/shared/result/Result';
import { Translator } from '../../src/presentation/i18n/Translator';
import { HistoryPage } from '../../src/presentation/pages/HistoryPage';
import { InMemoryMeetingRepository } from '../fakes/InMemoryMeetingRepository';
import { finishedMeeting, settle } from './meetingFixtures';

const STANDUP = Template.fromDefinition({
  id: 'standup-ab12',
  name: 'Daily standup',
  builtIn: false,
  systemRole: 'a daily standup',
  mindMapStructure: 'Team → Done, Doing, Blocked',
  summaryKinds: SUMMARY_KINDS,
  featuredOrder: SUMMARY_KINDS,
  kindLabels: {},
  promptOverrides: {},
});

const templates = {
  execute: (): Promise<Result<Template[], AppError>> =>
    Promise.resolve(ok([Template.generic(), Template.work(), Template.interview(), STANDUP])),
};

const search = async (root: HTMLElement, query: string): Promise<void> => {
  const input = root.querySelector<HTMLInputElement>('#search')!;
  input.value = query;
  input.dispatchEvent(new Event('input'));
  await settle();
};

const renderHistory = async (
  repo: InMemoryMeetingRepository,
  language: LanguageCode = 'en',
): Promise<{ root: HTMLElement; repo: InMemoryMeetingRepository }> => {
  const page = new HistoryPage({
    listTemplates: templates,
    listMeetings: new ListMeetingsUseCase(repo),
    getMeeting: new GetMeetingUseCase(repo),
    saveMeeting: new SaveMeetingUseCase(repo),
    deleteMeeting: new DeleteMeetingUseCase(repo),
    clearMeetings: new ClearMeetingsUseCase(repo),
    translator: new Translator(language),
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

  it('shows and finds a custom template by its name, never its id', async () => {
    const repo = new InMemoryMeetingRepository();
    await repo.save(finishedMeeting({ title: 'Monday', seconds: 600, template: STANDUP }));
    await repo.save(finishedMeeting({ title: 'Tuesday', seconds: 600 }));
    const { root } = await renderHistory(repo);

    const rows = (): HTMLElement[] => [...root.querySelectorAll<HTMLElement>('#list li')];
    const monday = rows().find((li) => li.textContent.includes('Monday'))!;
    expect(monday.textContent).toContain('Daily standup');
    expect(monday.textContent).not.toContain('standup-ab12');

    await search(root, 'daily stand');
    expect(rows().map((li) => li.querySelector('h2')?.textContent)).toEqual(['Monday']);
  });

  it('titles an untitled meeting in the interface language and finds it by that title', async () => {
    const repo = new InMemoryMeetingRepository();
    const meeting = Meeting.start({
      template: Template.work(),
      language: Language.of('es'),
      now: new Date(2026, 9, 3, 15, 37),
    });
    meeting.finish(new Date(2026, 9, 3, 16, 19));
    await repo.save(meeting);
    const { root } = await renderHistory(repo, 'es');

    expect(root.querySelector('#list h2')?.textContent).toBe('Reunión · 3 oct, 15:37');
    await search(root, 'reunión');
    expect(root.querySelectorAll('#list li')).toHaveLength(1);
  });

  it('keeps each meta value whole and starts each separator on the value it introduces', async () => {
    const repo = new InMemoryMeetingRepository();
    await repo.save(finishedMeeting({ title: 'Budget review', seconds: 2520 }));
    const { root } = await renderHistory(repo);

    const parts = [...root.querySelectorAll<HTMLElement>('#list li p span')].map(
      (span) => span.textContent,
    );
    expect(parts).toHaveLength(3);
    expect(parts[0]).not.toContain('·');
    expect(parts[1]).toBe('· 42 min');
    expect(parts[2]).toBe('· Work');
    expect(parts.every((part) => !part.trimEnd().endsWith('·'))).toBe(true);
  });
});
