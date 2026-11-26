import { sanitizeTemplate } from '../../domain/meeting/services/TemplateSanitizer';
import type { TemplateRepository } from '../../domain/meeting/ports/TemplateRepository';
import {
  BUILT_IN_TEMPLATES,
  type TemplateDefinition,
} from '../../domain/meeting/value-objects/Template';
import { AppError } from '../../shared/errors/AppError';
import { err, ok, type Result } from '../../shared/result/Result';
import { storageError } from './storageError';

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
      const defs = parsed.flatMap((item) => sanitizeTemplate(item) ?? []);
      return Promise.resolve(ok(defs));
    } catch (cause) {
      return Promise.resolve(err(storageError('Failed to load templates', cause)));
    }
  }

  async save(definition: TemplateDefinition): Promise<Result<void, AppError>> {
    if (definition.builtIn) {
      return err(
        new AppError(
          'CONFIG_INVALID',
          'Built-in templates cannot be modified',
          undefined,
          [],
          'builtin_readonly',
        ),
      );
    }
    if (Object.hasOwn(BUILT_IN_TEMPLATES, definition.id)) {
      return err(
        new AppError(
          'CONFIG_INVALID',
          'Template id collides with a built-in id',
          undefined,
          [],
          'id_collision',
        ),
      );
    }
    const loaded = await this.load();
    if (!loaded.ok) return loaded;
    const others = loaded.value.filter((d) => d.id !== definition.id);
    const next = [...others, definition];
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(next.map(toPersisted)));
      return ok(undefined);
    } catch (cause) {
      return err(storageError('Failed to save template', cause));
    }
  }

  async delete(id: string): Promise<Result<void, AppError>> {
    if (Object.hasOwn(BUILT_IN_TEMPLATES, id)) {
      return err(
        new AppError(
          'CONFIG_INVALID',
          'Built-in templates cannot be deleted',
          undefined,
          [],
          'builtin_readonly',
        ),
      );
    }
    const loaded = await this.load();
    if (!loaded.ok) return loaded;
    const remaining = loaded.value.filter((d) => d.id !== id);
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(remaining.map(toPersisted)));
      return ok(undefined);
    } catch (cause) {
      return err(storageError('Failed to delete template', cause));
    }
  }
}

const toPersisted = (def: TemplateDefinition): PersistedTemplate => ({
  id: def.id,
  name: def.name,
  systemRole: def.systemRole,
  mindMapStructure: def.mindMapStructure,
  summaryKinds: [...def.summaryKinds],
  featuredOrder: [...def.featuredOrder],
  kindLabels: { ...def.kindLabels },
  promptOverrides: { ...def.promptOverrides },
});
