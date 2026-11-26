import { beforeEach, describe, expect, it } from 'vitest';
import { DeleteTemplateUseCase } from '../../src/application/use-cases/DeleteTemplateUseCase';
import { ExportTemplateUseCase } from '../../src/application/use-cases/ExportTemplateUseCase';
import { ImportTemplatesUseCase } from '../../src/application/use-cases/ImportTemplatesUseCase';
import { ListMeetingsUseCase } from '../../src/application/use-cases/ListMeetingsUseCase';
import { ListTemplatesUseCase } from '../../src/application/use-cases/ListTemplatesUseCase';
import { SaveTemplateUseCase } from '../../src/application/use-cases/SaveTemplateUseCase';
import { TemplateRegistry } from '../../src/domain/meeting/services/TemplateRegistry';
import { serializeTemplates } from '../../src/domain/meeting/services/TemplateTransfer';
import type { TemplateDefinition } from '../../src/domain/meeting/value-objects/Template';
import { SUMMARY_KINDS } from '../../src/domain/summary/value-objects/SummaryKind';
import { LocalStorageTemplateRepository } from '../../src/infrastructure/persistence/LocalStorageTemplateRepository';
import { Translator } from '../../src/presentation/i18n/Translator';
import { TemplatesPage } from '../../src/presentation/pages/TemplatesPage';
import { InMemoryMeetingRepository } from '../fakes/InMemoryMeetingRepository';

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

describe('TemplatesPage transfer', () => {
  let repo: LocalStorageTemplateRepository;
  let root: HTMLElement;
  let downloads: { blob: Blob; filename: string }[];

  const open = async (picked: string | null): Promise<void> => {
    const registry = new TemplateRegistry(repo);
    const meetings = new InMemoryMeetingRepository();
    const page = new TemplatesPage({
      listTemplates: new ListTemplatesUseCase(registry),
      listMeetings: new ListMeetingsUseCase(meetings),
      saveTemplate: new SaveTemplateUseCase(registry),
      deleteTemplate: new DeleteTemplateUseCase(registry, meetings),
      exportTemplate: new ExportTemplateUseCase(registry),
      importTemplates: new ImportTemplatesUseCase(registry),
      translator: new Translator('en'),
      pickFile: () => Promise.resolve(picked),
      download: (blob, filename) => downloads.push({ blob, filename }),
    });
    root = document.createElement('div');
    document.body.appendChild(root);
    await page.render(root);
  };
  const status = (): string => root.querySelector('#list-status')!.textContent ?? '';
  const customCount = async (): Promise<number> => {
    const loaded = await repo.load();
    return loaded.ok ? loaded.value.length : -1;
  };
  const clickImport = async (): Promise<void> => {
    root.querySelector<HTMLButtonElement>('#btn-import')!.click();
    await settle();
  };

  beforeEach(async () => {
    window.localStorage.clear();
    document.body.innerHTML = '';
    downloads = [];
    repo = new LocalStorageTemplateRepository(window.localStorage);
    await repo.save(CUSTOM);
  });

  it('offers export on custom rows only and downloads the template file', async () => {
    await open(null);

    expect(root.querySelectorAll('[data-export]')).toHaveLength(1);
    root.querySelector<HTMLButtonElement>(`[data-export="${CUSTOM.id}"]`)!.click();
    await settle();

    expect(downloads.map((d) => d.filename)).toEqual(['standup.mintza-template.json']);
    expect(await downloads[0]!.blob.text()).toBe(serializeTemplates([CUSTOM]));
  });

  it('imports a picked file and reports the count', async () => {
    await open(serializeTemplates([{ ...CUSTOM, id: 'retro-1', name: 'Retro' }]));
    await clickImport();

    expect(status()).toBe('1 template imported');
    expect(root.querySelector('#list')!.textContent).toContain('Retro');
  });

  it('reports the plural count for several templates', async () => {
    await open(
      serializeTemplates([
        { ...CUSTOM, id: 'retro-1', name: 'Retro' },
        { ...CUSTOM, id: 'review-1', name: 'Review' },
      ]),
    );
    await clickImport();

    expect(status()).toBe('2 templates imported');
  });

  it('shows the error and saves nothing for an invalid file', async () => {
    await open('not json');
    await clickImport();

    expect(status()).toBe('That file is not valid JSON.');
    expect(await customCount()).toBe(1);
  });

  it('does nothing when the picker is cancelled', async () => {
    await open(null);
    await clickImport();

    expect(status()).toBe('');
    expect(await customCount()).toBe(1);
  });
});
