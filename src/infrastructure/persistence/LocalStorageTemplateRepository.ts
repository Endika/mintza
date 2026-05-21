import type { TemplateRepository } from '../../domain/meeting/ports/TemplateRepository';
import {
  BUILT_IN_TEMPLATES,
  type TemplateDefinition,
} from '../../domain/meeting/value-objects/Template';
import {
  SUMMARY_KINDS,
  isSummaryKind,
  type SummaryKind,
} from '../../domain/summary/value-objects/SummaryKind';
import { AppError } from '../../shared/errors/AppError';
import { err, ok, type Result } from '../../shared/result/Result';

const STORAGE_KEY = 'mintza:templates:v1';

interface PersistedTemplate {
  id: string;
  name: string;
  systemRole: string;
  mindMapStructure: string;
  summaryKinds: string[];
  featuredOrder: string[];
  kindLabels: Record<string, string>;
  promptOverrides: Record<string, string>;
}

export class LocalStorageTemplateRepository implements TemplateRepository {
  constructor(private readonly storage: Storage = window.localStorage) {}

  load(): Promise<Result<TemplateDefinition[], AppError>> {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return Promise.resolve(ok([]));
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return Promise.resolve(ok([]));
      const defs = parsed
        .filter((item): item is PersistedTemplate => isPersisted(item))
        .map(fromPersisted);
      return Promise.resolve(ok(defs));
    } catch (cause) {
      return Promise.resolve(
        err(new AppError('STORAGE_FAILED', 'Failed to load templates', cause)),
      );
    }
  }

  async save(definition: TemplateDefinition): Promise<Result<void, AppError>> {
    if (definition.builtIn) {
      return err(new AppError('CONFIG_INVALID', 'Built-in templates cannot be modified'));
    }
    if (definition.id in BUILT_IN_TEMPLATES) {
      return err(new AppError('CONFIG_INVALID', 'Template id collides with a built-in id'));
    }
    const loaded = await this.load();
    if (!loaded.ok) return loaded;
    const others = loaded.value.filter((d) => d.id !== definition.id);
    const next = [...others, definition];
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(next.map(toPersisted)));
      return ok(undefined);
    } catch (cause) {
      return err(new AppError('STORAGE_FAILED', 'Failed to save template', cause));
    }
  }

  async delete(id: string): Promise<Result<void, AppError>> {
    if (id in BUILT_IN_TEMPLATES) {
      return err(new AppError('CONFIG_INVALID', 'Built-in templates cannot be deleted'));
    }
    const loaded = await this.load();
    if (!loaded.ok) return loaded;
    const remaining = loaded.value.filter((d) => d.id !== id);
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(remaining.map(toPersisted)));
      return ok(undefined);
    } catch (cause) {
      return err(new AppError('STORAGE_FAILED', 'Failed to delete template', cause));
    }
  }
}

const isPersisted = (raw: unknown): raw is PersistedTemplate => {
  if (typeof raw !== 'object' || raw === null) return false;
  const obj = raw as Record<string, unknown>;
  return (
    typeof obj['id'] === 'string' &&
    typeof obj['name'] === 'string' &&
    typeof obj['systemRole'] === 'string' &&
    typeof obj['mindMapStructure'] === 'string' &&
    Array.isArray(obj['summaryKinds']) &&
    Array.isArray(obj['featuredOrder'])
  );
};

const fromPersisted = (p: PersistedTemplate): TemplateDefinition => {
  const summaryKinds = p.summaryKinds.filter(isSummaryKind);
  const featuredOrder = p.featuredOrder.filter(isSummaryKind);
  return {
    id: p.id,
    name: p.name,
    builtIn: false,
    systemRole: p.systemRole,
    mindMapStructure: p.mindMapStructure,
    summaryKinds: summaryKinds.length > 0 ? summaryKinds : SUMMARY_KINDS,
    featuredOrder: featuredOrder.length > 0 ? featuredOrder : summaryKinds,
    kindLabels: filterRecord(p.kindLabels),
    promptOverrides: filterRecord(p.promptOverrides),
  };
};

const filterRecord = (obj: Record<string, string>): Partial<Record<SummaryKind, string>> => {
  const result: Partial<Record<SummaryKind, string>> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isSummaryKind(key) && typeof value === 'string' && value.trim().length > 0) {
      result[key] = value;
    }
  }
  return result;
};

const toPersisted = (def: TemplateDefinition): PersistedTemplate => ({
  id: def.id,
  name: def.name,
  systemRole: def.systemRole,
  mindMapStructure: def.mindMapStructure,
  summaryKinds: [...def.summaryKinds],
  featuredOrder: [...def.featuredOrder],
  kindLabels: { ...def.kindLabels } as Record<string, string>,
  promptOverrides: { ...def.promptOverrides } as Record<string, string>,
});
