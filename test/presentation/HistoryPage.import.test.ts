import { afterEach, describe, expect, it } from 'vitest';
import { ClearMeetingsUseCase } from '../../src/application/use-cases/ClearMeetingsUseCase';
import { DeleteMeetingUseCase } from '../../src/application/use-cases/DeleteMeetingUseCase';
import { GetMeetingUseCase } from '../../src/application/use-cases/GetMeetingUseCase';
import { ListMeetingsUseCase } from '../../src/application/use-cases/ListMeetingsUseCase';
import { SaveMeetingUseCase } from '../../src/application/use-cases/SaveMeetingUseCase';
import { serializeMeeting } from '../../src/domain/meeting/services/MeetingTransfer';
import { Template } from '../../src/domain/meeting/value-objects/Template';
import { SUMMARY_KINDS } from '../../src/domain/summary/value-objects/SummaryKind';
import { Translator } from '../../src/presentation/i18n/Translator';
import { HistoryPage } from '../../src/presentation/pages/HistoryPage';
import { InMemoryMeetingRepository } from '../fakes/InMemoryMeetingRepository';
import { buildImporters } from './importFixtures';
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

const render = async (
  file: string | null,
  repo = new InMemoryMeetingRepository(),
): Promise<{ root: HTMLElement; repo: InMemoryMeetingRepository }> => {
  const { importMeeting, listTemplates } = buildImporters(repo);
  const page = new HistoryPage({
    listTemplates,
    importMeeting,
    listMeetings: new ListMeetingsUseCase(repo),
    getMeeting: new GetMeetingUseCase(repo),
    saveMeeting: new SaveMeetingUseCase(repo),
    deleteMeeting: new DeleteMeetingUseCase(repo),
    clearMeetings: new ClearMeetingsUseCase(repo),
    translator: new Translator('en'),
    pickFile: () => Promise.resolve(file),
  });
  const root = document.createElement('div');
  document.body.appendChild(root);
  await page.render(root);
  return { root, repo };
};

const clickImport = async (root: HTMLElement): Promise<void> => {
  root.querySelector<HTMLButtonElement>('#btn-import')!.click();
  await settle();
};

const storedCount = async (repo: InMemoryMeetingRepository): Promise<number> => {
  const all = await repo.list();
  return all.ok ? all.value.length : -1;
};

const fileOf = (template: Template = Template.work()): string =>
  serializeMeeting(finishedMeeting({ title: 'Planning', seconds: 60, template }));

afterEach(() => {
  document.body.innerHTML = '';
  window.location.hash = '';
});

describe('HistoryPage import', () => {
  it('imports straight away and opens the meeting when its template exists', async () => {
    const { root, repo } = await render(fileOf());
    await clickImport(root);

    expect(root.querySelector('#import-card')).toBeNull();
    expect(await storedCount(repo)).toBe(1);
    expect(window.location.hash).toMatch(/^#\/meeting\?id=/);
  });

  it('asks what to do when the template is missing, and imports with the chosen local one', async () => {
    const { root, repo } = await render(fileOf(STANDUP));
    await clickImport(root);

    const card = root.querySelector('#import-card')!;
    expect(card.textContent).toContain("This meeting's template isn't here");
    expect(card.querySelector<HTMLInputElement>('input[value="recreate"]')!.checked).toBe(true);
    expect(await storedCount(repo)).toBe(0);

    const select = root.querySelector<HTMLSelectElement>('#import-template')!;
    expect(select.disabled).toBe(true);
    card.querySelector<HTMLInputElement>('input[value="use"]')!.click();
    expect(select.disabled).toBe(false);
    card.querySelector<HTMLInputElement>('input[value="recreate"]')!.click();
    expect(select.disabled).toBe(true);
    card.querySelector<HTMLInputElement>('input[value="use"]')!.click();
    root.querySelector<HTMLSelectElement>('#import-template')!.value = Template.interview().id;
    root.querySelector<HTMLButtonElement>('#import-confirm')!.click();
    await settle();

    const saved = await repo.list();
    expect(saved.ok && saved.value[0]?.templateKind).toBe(Template.interview().id);
    expect(window.location.hash).toMatch(/^#\/meeting\?id=/);
  });

  it('saves nothing when the card is cancelled', async () => {
    const { root, repo } = await render(fileOf(STANDUP));
    await clickImport(root);
    root.querySelector<HTMLButtonElement>('#import-cancel')!.click();

    expect(root.querySelector('#import-card')).toBeNull();
    expect(await storedCount(repo)).toBe(0);
    expect(window.location.hash).toBe('');
  });

  it('says so when the file is JSON but not a meeting', async () => {
    const { root } = await render('{"hello": 1}');
    await clickImport(root);

    expect(root.querySelector('#history-status')!.textContent).toBe(
      'That file is not a Mintza meeting file.',
    );
  });

  it('offers only the local template when a legacy file carries no definition', async () => {
    const legacy = JSON.stringify({
      id: '3f2b8c1e-5d4a-4b7e-9c10-1a2b3c4d5e6f',
      title: 'Old',
      template: 'long-gone',
      language: 'en',
      startedAt: '2026-05-21T10:00:00.000Z',
      endedAt: '2026-05-21T10:00:09.000Z',
      segments: [],
      summaries: {},
    });
    const { root } = await render(legacy);
    await clickImport(root);

    const radios = root.querySelectorAll<HTMLInputElement>('#import-card input[type="radio"]');
    expect([...radios].map((r) => [r.value, r.checked])).toEqual([['use', true]]);
    expect(root.querySelector<HTMLSelectElement>('#import-template')!.disabled).toBe(false);
  });

  it('tells the user when the file is not a meeting', async () => {
    const { root, repo } = await render('not json');
    await clickImport(root);

    expect(root.querySelector('#history-status')!.textContent).toBe('That file is not valid JSON.');
    expect(root.querySelector('#import-card')).toBeNull();
    expect(await storedCount(repo)).toBe(0);
  });

  it('marks imported meetings in the list', async () => {
    const { root, repo } = await render(fileOf(STANDUP));
    await clickImport(root);
    root.querySelector<HTMLButtonElement>('#import-confirm')!.click();
    await settle();

    const saved = await repo.list();
    expect(saved.ok && saved.value[0]?.templateKind).toBe(STANDUP.id);
    const again = await render(null, repo);
    expect(again.root.querySelector('#list li')?.textContent).toContain('Imported');
  });
});
