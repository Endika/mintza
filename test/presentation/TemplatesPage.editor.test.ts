import { describe, expect, it } from 'vitest';
import { DeleteTemplateUseCase } from '../../src/application/use-cases/DeleteTemplateUseCase';
import { ListMeetingsUseCase } from '../../src/application/use-cases/ListMeetingsUseCase';
import { ListTemplatesUseCase } from '../../src/application/use-cases/ListTemplatesUseCase';
import { SaveTemplateUseCase } from '../../src/application/use-cases/SaveTemplateUseCase';
import { TemplateRegistry } from '../../src/domain/meeting/services/TemplateRegistry';
import {
  BUILT_IN_TEMPLATES,
  type TemplateDefinition,
} from '../../src/domain/meeting/value-objects/Template';
import { SUMMARY_KINDS } from '../../src/domain/summary/value-objects/SummaryKind';
import { LocalStorageTemplateRepository } from '../../src/infrastructure/persistence/LocalStorageTemplateRepository';
import { Translator } from '../../src/presentation/i18n/Translator';
import { TemplatesPage } from '../../src/presentation/pages/TemplatesPage';
import { InMemoryMeetingRepository } from '../fakes/InMemoryMeetingRepository';

const settle = async (): Promise<void> => {
  for (let i = 0; i < 10; i++) await new Promise((resolve) => setTimeout(resolve, 0));
};

const setup = async (
  seed: TemplateDefinition[] = [],
): Promise<{ root: HTMLElement; repo: LocalStorageTemplateRepository }> => {
  window.localStorage.clear();
  const repo = new LocalStorageTemplateRepository(window.localStorage);
  for (const def of seed) await repo.save(def);
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
    expect(root.querySelector<HTMLSelectElement>('#tpl-main-select')!.value).toBe('action_items');
    const main = root.querySelector<HTMLSelectElement>('#tpl-main-select')!;
    main.value = 'decisions';
    main.dispatchEvent(new Event('change', { bubbles: true }));
    expect(root.querySelector('[data-kind="decisions"] .sr-only')).not.toBeNull();
    root.querySelector<HTMLInputElement>('input[name="label_bullet_points"]')!.value = 'Gone';
    root
      .querySelector<HTMLFormElement>('#tpl-form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();

    const loaded = await repo.load();
    const saved = loaded.ok ? loaded.value.find((d) => d.name === 'Standup') : undefined;
    expect(saved?.featuredOrder[0]).toBe('decisions');
    expect(saved?.summaryKinds).not.toContain('bullet_points');
    expect(saved?.promptOverrides).toEqual({});
    expect(saved?.kindLabels).toEqual({});
    root.remove();
  });

  it('keeps the same main-result select, its choice and focus while results change', async () => {
    const { root } = await setup();
    root.querySelector<HTMLButtonElement>('#btn-new')!.click();
    const select = root.querySelector<HTMLSelectElement>('#tpl-main-select')!;
    const options = (): string[] => [...select.options].map((o) => o.value);
    select.focus();
    select.value = 'decisions';
    select.dispatchEvent(new Event('change', { bubbles: true }));

    expect(root.querySelector('#tpl-main-select')).toBe(select);
    expect(document.activeElement).toBe(select);
    expect(select.value).toBe('decisions');
    expect(options()[0]).toBe('decisions');

    root.querySelector<HTMLButtonElement>('[data-kind="bullet_points"]')!.click();
    expect(root.querySelector('#tpl-main-select')).toBe(select);
    expect(options()).not.toContain('bullet_points');
    expect(select.value).toBe('decisions');

    for (const kind of SUMMARY_KINDS) {
      if (options().includes(kind)) {
        root.querySelector<HTMLButtonElement>(`[data-kind="${kind}"]`)!.click();
      }
    }
    expect(root.querySelector<HTMLElement>('#tpl-main')!.hidden).toBe(true);
    root.querySelector<HTMLButtonElement>('[data-kind="action_items"]')!.click();
    expect(root.querySelector('#tpl-main-select')).toBe(select);
    expect(root.querySelector<HTMLElement>('#tpl-main')!.hidden).toBe(false);
    expect(options()).toEqual(['action_items']);
    expect(select.value).toBe('action_items');
    root.remove();
  });

  it('renders a hostile template name as text in the list and the editor', async () => {
    const name = 'Retro"><img src=x onerror=alert(1)>';
    const { root } = await setup([
      {
        id: 'retro-1',
        name,
        builtIn: false,
        systemRole: 'a retro',
        mindMapStructure: 'Team',
        summaryKinds: SUMMARY_KINDS,
        featuredOrder: SUMMARY_KINDS,
        kindLabels: {},
        promptOverrides: {},
      },
    ]);

    expect(root.querySelector('img')).toBeNull();
    const titles = [...root.querySelectorAll('#list h2')].map((h) => h.textContent);
    expect(titles).toContain(name);

    root.querySelector<HTMLButtonElement>('[data-edit="retro-1"]')!.click();
    expect(root.querySelector('img')).toBeNull();
    expect(root.querySelector<HTMLInputElement>('input[name="name"]')!.value).toBe(name);
    root.remove();
  });
});
