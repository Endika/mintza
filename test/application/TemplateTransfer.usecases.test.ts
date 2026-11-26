import { beforeEach, describe, expect, it } from 'vitest';
import { ExportTemplateUseCase } from '../../src/application/use-cases/ExportTemplateUseCase';
import { ImportTemplatesUseCase } from '../../src/application/use-cases/ImportTemplatesUseCase';
import { TemplateRegistry } from '../../src/domain/meeting/services/TemplateRegistry';
import { serializeTemplates } from '../../src/domain/meeting/services/TemplateTransfer';
import type { TemplateDefinition } from '../../src/domain/meeting/value-objects/Template';
import { SUMMARY_KINDS } from '../../src/domain/summary/value-objects/SummaryKind';
import { LocalStorageTemplateRepository } from '../../src/infrastructure/persistence/LocalStorageTemplateRepository';

const memoryStorage = (): Storage => {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, v),
  };
};

const def = (id: string, name = 'Standup'): TemplateDefinition => ({
  id,
  name,
  builtIn: false,
  systemRole: 'a daily standup',
  mindMapStructure: 'Team → Done, Doing, Blocked',
  summaryKinds: SUMMARY_KINDS,
  featuredOrder: SUMMARY_KINDS,
  kindLabels: {},
  promptOverrides: {},
});

const COPY = 'imported';

describe('template import and export', () => {
  let registry: TemplateRegistry;
  let importer: ImportTemplatesUseCase;
  let exporter: ExportTemplateUseCase;
  const ids = (): Promise<string[]> =>
    registry.list().then((r) => (r.ok ? r.value.filter((t) => !t.builtIn).map((t) => t.id) : []));

  beforeEach(() => {
    registry = new TemplateRegistry(new LocalStorageTemplateRepository(memoryStorage()));
    importer = new ImportTemplatesUseCase(registry, (name) => `${name.toLowerCase()}-new`);
    exporter = new ExportTemplateUseCase(registry);
  });

  it('keeps the id of a fresh template', async () => {
    const result = await importer.execute({
      text: serializeTemplates([def('standup-1')]),
      copySuffix: COPY,
    });

    expect(result.ok && result.value).toEqual([def('standup-1')]);
    expect(await ids()).toEqual(['standup-1']);
  });

  it('renames a template whose id belongs to a custom one', async () => {
    await registry.save(def('standup-1'));

    const result = await importer.execute({
      text: serializeTemplates([def('standup-1')]),
      copySuffix: COPY,
    });

    expect(result.ok && result.value[0]).toMatchObject({
      id: 'standup-new',
      name: 'Standup (imported)',
    });
    expect(await ids()).toEqual(['standup-1', 'standup-new']);
  });

  it('renames a template whose id belongs to a built-in', async () => {
    const result = await importer.execute({
      text: serializeTemplates([def('work', 'Work')]),
      copySuffix: COPY,
    });

    expect(result.ok && result.value[0]).toMatchObject({ id: 'work-new', name: 'Work (imported)' });
  });

  it('renames the second of two entries sharing an id', async () => {
    const result = await importer.execute({
      text: serializeTemplates([def('a'), def('a', 'Other')]),
      copySuffix: COPY,
    });

    expect(result.ok && result.value.map((d) => d.id)).toEqual(['a', 'other-new']);
  });

  it('saves nothing when the file does not parse', async () => {
    const result = await importer.execute({ text: 'nope', copySuffix: COPY });

    expect(!result.ok && result.error.reason).toBe('import_not_json');
    expect(await ids()).toEqual([]);
  });

  it('refuses to export a built-in template', async () => {
    const result = await exporter.execute('work');

    expect(!result.ok && result.error.reason).toBe('builtin_readonly');
  });

  it('round-trips an exported template', async () => {
    await registry.save(def('standup-1'));
    const exported = await exporter.execute('standup-1');
    if (!exported.ok) throw exported.error;

    expect(exported.value.filename).toBe('standup.mintza-template.json');
    const other = new TemplateRegistry(new LocalStorageTemplateRepository(memoryStorage()));
    const result = await new ImportTemplatesUseCase(other).execute({
      text: exported.value.content,
      copySuffix: COPY,
    });

    expect(result.ok && result.value).toEqual([def('standup-1')]);
  });
});
