import { describe, expect, it } from 'vitest';
import { DeleteTemplateUseCase } from '../../src/application/use-cases/DeleteTemplateUseCase';
import { ListMeetingsUseCase } from '../../src/application/use-cases/ListMeetingsUseCase';
import { ListTemplatesUseCase } from '../../src/application/use-cases/ListTemplatesUseCase';
import { SaveTemplateUseCase } from '../../src/application/use-cases/SaveTemplateUseCase';
import { TemplateRegistry } from '../../src/domain/meeting/services/TemplateRegistry';
import { BUILT_IN_TEMPLATES } from '../../src/domain/meeting/value-objects/Template';
import { LocalStorageTemplateRepository } from '../../src/infrastructure/persistence/LocalStorageTemplateRepository';
import { Translator } from '../../src/presentation/i18n/Translator';
import { TemplatesPage } from '../../src/presentation/pages/TemplatesPage';
import { InMemoryMeetingRepository } from '../fakes/InMemoryMeetingRepository';

const settle = async (): Promise<void> => {
  for (let i = 0; i < 10; i++) await new Promise((resolve) => setTimeout(resolve, 0));
};

const setup = async (): Promise<{ root: HTMLElement; repo: LocalStorageTemplateRepository }> => {
  window.localStorage.clear();
  const repo = new LocalStorageTemplateRepository(window.localStorage);
  const registry = new TemplateRegistry(repo);
  const meetings = new InMemoryMeetingRepository();
  const page = new TemplatesPage({
    listTemplates: new ListTemplatesUseCase(registry),
    listMeetings: new ListMeetingsUseCase(meetings),
    saveTemplate: new SaveTemplateUseCase(registry),
    deleteTemplate: new DeleteTemplateUseCase(registry, meetings),
    translator: new Translator('en'),
  });
  const root = document.createElement('div');
  document.body.appendChild(root);
  await page.render(root);
  return { root, repo };
};

describe('TemplatesPage', () => {
  it('lists built-ins by name and result count, never by their prompt text', async () => {
    const { root } = await setup();
    const text = root.querySelector('#list')!.textContent ?? '';
    expect(text).toContain('8 results');
    expect(text).not.toContain(BUILT_IN_TEMPLATES.work.systemRole);
    root.remove();
  });

  it('opens the editor in place of the list and saves the main result first', async () => {
    const { root, repo } = await setup();
    root.querySelector<HTMLButtonElement>('#btn-new')!.click();
    expect(root.querySelector('#list')!.classList.contains('hidden')).toBe(true);
    expect(root.querySelectorAll('[data-kind]')).toHaveLength(8);

    root.querySelector<HTMLInputElement>('input[name="name"]')!.value = 'Standup';
    root.querySelector<HTMLInputElement>('input[name="systemRole"]')!.value = 'a daily standup';
    root.querySelector<HTMLTextAreaElement>('textarea[name="mindMapStructure"]')!.value = 'Team';
    root.querySelector<HTMLButtonElement>('[data-kind="bullet_points"]')!.click();
    expect(root.querySelector('#tpl-main')!.textContent).toContain('Action items');
    root.querySelector<HTMLButtonElement>('[data-make-main="decisions"]')!.click();
    root
      .querySelector<HTMLFormElement>('#tpl-form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();

    const loaded = await repo.load();
    const saved = loaded.ok ? loaded.value.find((d) => d.name === 'Standup') : undefined;
    expect(saved?.featuredOrder[0]).toBe('decisions');
    expect(saved?.summaryKinds).not.toContain('bullet_points');
    expect(saved?.promptOverrides).toEqual({});
    root.remove();
  });
});
