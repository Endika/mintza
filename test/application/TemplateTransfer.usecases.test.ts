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

const throwingStorage = (method: 'getItem' | 'setItem'): Storage => ({
  ...memoryStorage(),
  [method]: () => {
    throw new Error('storage down');
  },
});

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

  it.each([
    ['work', 'builtin_readonly'],
    ['missing', undefined],
  ])('refuses to export %s', async (id, reason) => {
    const result = await exporter.execute(id);

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.reason).toBe(reason);
  });

  it('never overwrites a template when the generated id is taken', async () => {
    await registry.save(def('standup-1'));
    await registry.save(def('standup-new', 'Existing'));
    const generated = ['standup-new', 'standup-fresh'];
    const retrying = new ImportTemplatesUseCase(registry, () => generated.shift()!);

    const result = await retrying.execute({
      text: serializeTemplates([def('standup-1')]),
      copySuffix: COPY,
    });

    expect(result.ok && result.value[0]?.id).toBe('standup-fresh');
    const kept = await registry.findById('standup-new');
    expect(kept.ok && kept.value?.toDefinition().name).toBe('Existing');
  });

  it('keeps ids that only match Object prototype keys', async () => {
    const result = await importer.execute({
      text: serializeTemplates([def('a'), def('constructor')]),
      copySuffix: COPY,
    });

    expect(result.ok && result.value.map((d) => d.id)).toEqual(['a', 'constructor']);
    expect(await ids()).toEqual(['a', 'constructor']);
  });

  it.each([
    ['export', (r: TemplateRegistry) => new ExportTemplateUseCase(r).execute('x')],
    [
      'import',
      (r: TemplateRegistry) =>
        new ImportTemplatesUseCase(r).execute({
          text: serializeTemplates([def('a')]),
          copySuffix: COPY,
        }),
    ],
  ])('fails %s when storage cannot be read', async (_name, run) => {
    const broken = new TemplateRegistry(
      new LocalStorageTemplateRepository(throwingStorage('getItem')),
    );

    expect((await run(broken)).ok).toBe(false);
  });

  it('fails import when storage cannot be written', async () => {
    const broken = new TemplateRegistry(
      new LocalStorageTemplateRepository(throwingStorage('setItem')),
    );

    const result = await new ImportTemplatesUseCase(broken).execute({
      text: serializeTemplates([def('a')]),
      copySuffix: COPY,
    });

    expect(result.ok).toBe(false);
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
