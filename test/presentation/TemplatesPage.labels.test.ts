import { describe, expect, it } from 'vitest';
import { DeleteTemplateUseCase } from '../../src/application/use-cases/DeleteTemplateUseCase';
import { ListMeetingsUseCase } from '../../src/application/use-cases/ListMeetingsUseCase';
import { ListTemplatesUseCase } from '../../src/application/use-cases/ListTemplatesUseCase';
import { SaveTemplateUseCase } from '../../src/application/use-cases/SaveTemplateUseCase';
import { TemplateRegistry } from '../../src/domain/meeting/services/TemplateRegistry';
import type { TemplateDefinition } from '../../src/domain/meeting/value-objects/Template';
import { SUMMARY_KINDS } from '../../src/domain/summary/value-objects/SummaryKind';
import { LocalStorageTemplateRepository } from '../../src/infrastructure/persistence/LocalStorageTemplateRepository';
import { Translator } from '../../src/presentation/i18n/Translator';
import { TemplatesPage } from '../../src/presentation/pages/TemplatesPage';
import { InMemoryMeetingRepository } from '../fakes/InMemoryMeetingRepository';
import { Template } from '../../src/domain/meeting/value-objects/Template';
import { finishedMeeting } from './meetingFixtures';

const CUSTOM: TemplateDefinition = {
  id: 'standup-ab12',
  name: 'Standup',
  builtIn: false,
  systemRole: 'a daily standup',
  mindMapStructure: 'Team → Done, Doing, Blocked',
  summaryKinds: SUMMARY_KINDS,
  featuredOrder: SUMMARY_KINDS,
  kindLabels: {},
  promptOverrides: {},
};

const settle = async (): Promise<void> => {
  for (let i = 0; i < 10; i++) await new Promise((resolve) => setTimeout(resolve, 0));
};

describe('TemplatesPage label overrides', () => {
  it('saves an edited template without pinning the default labels as overrides', async () => {
    window.localStorage.clear();
    const repo = new LocalStorageTemplateRepository(window.localStorage);
    await repo.save(CUSTOM);
    const registry = new TemplateRegistry(repo);
    const meetings = new InMemoryMeetingRepository();
    const page = new TemplatesPage({
      listTemplates: new ListTemplatesUseCase(registry),
      listMeetings: new ListMeetingsUseCase(meetings),
      saveTemplate: new SaveTemplateUseCase(registry),
      deleteTemplate: new DeleteTemplateUseCase(registry, meetings),
      translator: new Translator('es'),
    });
    const root = document.createElement('div');
    document.body.appendChild(root);

    await page.render(root);
    root.querySelector<HTMLButtonElement>(`[data-edit="${CUSTOM.id}"]`)!.click();
    root
      .querySelector<HTMLFormElement>('#tpl-form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();

    expect(root.querySelector('#editor')!.classList.contains('hidden')).toBe(true);
    const loaded = await repo.load();
    expect(loaded.ok && loaded.value.find((d) => d.id === CUSTOM.id)?.kindLabels).toEqual({});
  });

  it('counts a single meeting in the singular', async () => {
    window.localStorage.clear();
    const repo = new LocalStorageTemplateRepository(window.localStorage);
    await repo.save(CUSTOM);
    const registry = new TemplateRegistry(repo);
    const meetings = new InMemoryMeetingRepository();
    await meetings.save(finishedMeeting({ title: 'One', seconds: 60 }));
    await meetings.save(
      finishedMeeting({ title: 'Two', seconds: 60, template: Template.fromDefinition(CUSTOM) }),
    );
    const render = async (language: 'en' | 'es' | 'eu'): Promise<string> => {
      const page = new TemplatesPage({
        listTemplates: new ListTemplatesUseCase(registry),
        listMeetings: new ListMeetingsUseCase(meetings),
        saveTemplate: new SaveTemplateUseCase(registry),
        deleteTemplate: new DeleteTemplateUseCase(registry, meetings),
        translator: new Translator(language),
      });
      const root = document.createElement('div');
      await page.render(root);
      await settle();
      return root.textContent;
    };

    const en = await render('en');
    expect(en).toContain('Used in 1 meeting');
    expect(en).toContain("Used in 1 meeting, so it can't be deleted");
    expect(en).not.toContain('(s)');
    const es = await render('es');
    expect(es).toContain('Usada en 1 reunión');
    expect(es).toContain('Se usa en 1 reunión, así que no se puede borrar');
    expect(es).not.toContain('(es)');
    const eu = await render('eu');
    expect(eu).toContain('Bilera batean erabilia');
    expect(eu).toContain('Bilera batean erabiltzen da; ezin da ezabatu');
  });
});
