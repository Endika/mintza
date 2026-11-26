import {
  SUMMARY_KINDS,
  isSummaryKind,
  type SummaryKind,
} from '../../summary/value-objects/SummaryKind';
import type { TemplateDefinition } from '../value-objects/Template';

interface RawTemplate {
  id: string;
  name: string;
  systemRole: string;
  mindMapStructure: string;
  summaryKinds: unknown[];
  featuredOrder: unknown[];
  kindLabels?: unknown;
  promptOverrides?: unknown;
}

/** Reads untrusted data into a custom template, or null when the required fields are missing. */
export const sanitizeTemplate = (raw: unknown): TemplateDefinition | null =>
  isRawTemplate(raw) ? fromRaw(raw) : null;

const isRawTemplate = (raw: unknown): raw is RawTemplate => {
  if (typeof raw !== 'object' || raw === null) return false;
  const obj = raw as Record<string, unknown>;
  return (
    isFilled(obj['id']) &&
    isFilled(obj['name']) &&
    typeof obj['systemRole'] === 'string' &&
    typeof obj['mindMapStructure'] === 'string' &&
    Array.isArray(obj['summaryKinds']) &&
    Array.isArray(obj['featuredOrder'])
  );
};

const isFilled = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isKind = (value: unknown): value is SummaryKind =>
  typeof value === 'string' && isSummaryKind(value);

const fromRaw = (p: RawTemplate): TemplateDefinition => {
  const summaryKinds = p.summaryKinds.filter(isKind);
  const featuredOrder = p.featuredOrder.filter(isKind);
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

const filterRecord = (obj: unknown): Partial<Record<SummaryKind, string>> => {
  const result: Partial<Record<SummaryKind, string>> = {};
  if (typeof obj !== 'object' || obj === null) return result;
  for (const [key, value] of Object.entries(obj)) {
    if (isSummaryKind(key) && typeof value === 'string' && value.trim().length > 0) {
      result[key] = value;
    }
  }
  return result;
};
