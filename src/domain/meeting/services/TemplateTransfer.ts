import { AppError, type ErrorReason } from '../../../shared/errors/AppError';
import { err, ok, type Result } from '../../../shared/result/Result';
import type { TemplateDefinition } from '../value-objects/Template';
import { sanitizeTemplate } from './TemplateSanitizer';

const FORMAT = 'mintza-templates';
const VERSION = 1;

export const serializeTemplates = (defs: readonly TemplateDefinition[]): string =>
  JSON.stringify(
    { format: FORMAT, version: VERSION, templates: defs.map(withoutBuiltIn) },
    null,
    2,
  );

export const parseTemplates = (text: string): Result<TemplateDefinition[], AppError> => {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (cause) {
    return failure('import_not_json', 'File is not valid JSON', cause);
  }
  const entries = entriesOf(json);
  if (!entries.ok) return entries;
  if (entries.value.length === 0) return failure('import_empty', 'File holds no valid template');
  const defs: TemplateDefinition[] = [];
  for (const entry of entries.value) {
    const def = sanitizeTemplate(entry);
    if (def === null || hasBlankField(def)) return wrongFormat();
    defs.push(def);
  }
  return ok(defs);
};

const hasBlankField = (def: TemplateDefinition): boolean =>
  [def.id, def.name, def.systemRole].some((value) => value.trim().length === 0);

const entriesOf = (json: unknown): Result<unknown[], AppError> => {
  if (Array.isArray(json)) return ok(json);
  if (typeof json !== 'object' || json === null) return wrongFormat();
  const obj = json as Record<string, unknown>;
  if (!('format' in obj)) return ok([obj]);
  if (obj['format'] !== FORMAT || !Array.isArray(obj['templates'])) return wrongFormat();
  if (obj['version'] !== VERSION) {
    return failure('import_unsupported_version', 'Unsupported template file version');
  }
  return ok(obj['templates']);
};

const withoutBuiltIn = ({
  builtIn: _builtIn,
  ...rest
}: TemplateDefinition): Omit<TemplateDefinition, 'builtIn'> => rest;

const wrongFormat = (): Result<never, AppError> =>
  failure('import_wrong_format', 'File is not a Mintza template file');

const failure = (reason: ErrorReason, message: string, cause?: unknown): Result<never, AppError> =>
  err(new AppError('CONFIG_INVALID', message, cause, [], reason));
