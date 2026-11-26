import { Language, type LanguageCode } from '../../language/value-objects/Language';
import { MindMap } from '../../mindmap/entities/MindMap';
import { MindMapNode } from '../../mindmap/value-objects/MindMapNode';
import { Summary } from '../../summary/entities/Summary';
import { LLM_PROVIDERS, type LLMProviderName } from '../../summary/value-objects/LLMProvider';
import { isSummaryKind, type SummaryKind } from '../../summary/value-objects/SummaryKind';
import { TemperatureScore } from '../../temperature/value-objects/TemperatureScore';
import { Money } from '../../tokens/value-objects/Money';
import { TokenCount } from '../../tokens/value-objects/TokenCount';
import { TranscriptSegment } from '../../transcription/entities/TranscriptSegment';
import { TranscriptText } from '../../transcription/value-objects/TranscriptText';
import {
  TRANSCRIPTION_PROVIDERS,
  type TranscriptionProviderName,
} from '../../transcription/value-objects/TranscriptionProvider';
import { AppError, type ErrorReason } from '../../../shared/errors/AppError';
import { err, ok, type Result } from '../../../shared/result/Result';
import type { Meeting, MeetingState } from '../entities/Meeting';
import { MeetingId } from '../value-objects/MeetingId';
import { Template, type TemplateDefinition } from '../value-objects/Template';
import { sanitizeTemplate } from './TemplateSanitizer';

const FORMAT = 'mintza-meeting';
const VERSION = 1;

export interface ImportedMeeting {
  readonly state: Omit<MeetingState, 'template'>;
  readonly templateId: string;
  readonly templateDefinition?: TemplateDefinition;
}

type Json = Record<string, unknown>;

export const serializeMeeting = (meeting: Meeting): string => {
  const { builtIn, ...definition } = meeting.template.toDefinition();
  return JSON.stringify(
    {
      format: FORMAT,
      version: VERSION,
      id: meeting.id.value,
      title: meeting.title,
      template: meeting.template.kind,
      ...(builtIn ? {} : { templateDefinition: definition }),
      language: meeting.language.code,
      startedAt: meeting.startedAt.toISOString(),
      endedAt: meeting.endedAt?.toISOString(),
      durationMs: meeting.durationMs,
      temperature: meeting.temperature?.value,
      segments: meeting.segments.map(segmentDto),
      summaries: Object.fromEntries(
        [...meeting.summaries.entries()].map(([kind, summary]) => [kind, summaryDto(summary)]),
      ),
      mindMap: meeting.mindMap ? nodeDto(meeting.mindMap.root) : undefined,
      mindMapUsage: meeting.mindMap?.usage && {
        model: meeting.mindMap.usage.model,
        tokensIn: meeting.mindMap.usage.tokensIn.value,
        tokensOut: meeting.mindMap.usage.tokensOut.value,
      },
      starred: meeting.starred,
      tags: [...meeting.tags],
    },
    null,
    2,
  );
};

export const parseMeeting = (text: string): Result<ImportedMeeting, AppError> => {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (cause) {
    return failure('import_not_json', 'File is not valid JSON', cause);
  }
  if (!isObject(json)) return wrongFormat();
  if ('format' in json) {
    if (json['format'] !== FORMAT) return wrongFormat();
    if (json['version'] !== VERSION) {
      return failure('import_unsupported_version', 'Unsupported meeting file version');
    }
  }
  try {
    return ok(readMeeting('format' in json ? json : upgradeLegacy(json)));
  } catch (cause) {
    return failure('import_not_meeting', 'File is not a Mintza meeting file', cause);
  }
};

const segmentDto = (s: TranscriptSegment): unknown => ({
  id: s.id,
  startMs: s.startMs,
  endMs: s.endMs,
  text: s.text.value,
  provider: s.provider,
  confidence: s.confidence,
});

const summaryDto = (s: Summary): unknown => ({
  content: s.content,
  provider: s.provider,
  model: s.model,
  tokensIn: s.tokensIn.value,
  tokensOut: s.tokensOut.value,
  generatedAt: s.generatedAt.toISOString(),
});

const nodeDto = (node: MindMapNode): unknown => ({
  label: node.label,
  children: node.children.map(nodeDto),
});

/** The pre-versioned export carried no token counts, ids, mind map, stars or tags. */
const upgradeLegacy = (raw: Json): Json => {
  const generatedAt = raw['endedAt'] ?? raw['startedAt'];
  const { segments, summaries } = raw;
  return {
    ...raw,
    segments: Array.isArray(segments)
      ? segments.map((s: unknown, i) => (isObject(s) ? { id: `segment-${i + 1}`, ...s } : s))
      : segments,
    summaries: isObject(summaries)
      ? Object.fromEntries(
          Object.entries(summaries).map(([kind, s]) => [
            kind,
            isObject(s) ? { tokensIn: 0, tokensOut: 0, generatedAt, ...s } : s,
          ]),
        )
      : summaries,
    starred: false,
    tags: [],
  };
};

const readMeeting = (raw: Json): ImportedMeeting => {
  const templateId = nonBlank(raw['template']);
  const templateDefinition = readDefinition(raw['templateDefinition']);
  const temperature = optional(raw['temperature'], (v) => TemperatureScore.of(number(v)));
  const mindMap = optional(raw['mindMap'], (v) => readMindMap(v, raw['mindMapUsage']));
  const startedAt = date(raw['startedAt']);
  const segments = list(raw['segments']).map(readSegment);
  const endedAt =
    optional(raw['endedAt'], date) ?? inferEnd(startedAt, raw['durationMs'], segments);
  return {
    templateId,
    ...(templateDefinition ? { templateDefinition } : {}),
    state: {
      id: MeetingId.restore(text(raw['id'])),
      title: nonBlank(raw['title']),
      language: Language.of(text(raw['language']) as LanguageCode),
      startedAt,
      endedAt,
      segments,
      summaries: readSummaries(raw['summaries']),
      ...(temperature ? { temperature } : {}),
      ...(mindMap ? { mindMap } : {}),
      cost: Money.zero(),
      starred: bool(raw['starred']),
      tags: list(raw['tags']).map(text),
      totalPausedMs: 0,
    },
  };
};

/** A file without `endedAt` must not import as a meeting that is still running. */
const inferEnd = (
  startedAt: Date,
  durationMs: unknown,
  segments: readonly TranscriptSegment[],
): Date => {
  const known = typeof durationMs === 'number' && Number.isFinite(durationMs) && durationMs >= 0;
  const length = known ? durationMs : Math.max(0, ...segments.map((s) => s.endMs));
  return new Date(startedAt.getTime() + length);
};

const readDefinition = (raw: unknown): TemplateDefinition | undefined =>
  optional(raw, (v) => {
    const def = sanitizeTemplate(v);
    if (def === null) throw new Error('Invalid template definition');
    Template.fromDefinition(def);
    return def;
  });

const readSegment = (raw: unknown): TranscriptSegment => {
  const o = object(raw);
  const confidence = optional(o['confidence'], number);
  return new TranscriptSegment({
    id: text(o['id']),
    startMs: number(o['startMs']),
    endMs: number(o['endMs']),
    text: TranscriptText.of(text(o['text'])),
    provider: oneOf<TranscriptionProviderName>(o['provider'], TRANSCRIPTION_PROVIDERS),
    ...(confidence !== undefined ? { confidence } : {}),
  });
};

const readSummaries = (raw: unknown): Map<SummaryKind, Summary> => {
  const summaries = new Map<SummaryKind, Summary>();
  for (const [kind, value] of Object.entries(object(raw))) {
    if (!isSummaryKind(kind)) throw new Error(`Unknown summary kind: ${kind}`);
    const o = object(value);
    const model = optional(o['model'], text);
    summaries.set(
      kind,
      new Summary({
        kind,
        content: text(o['content']),
        tokensIn: TokenCount.of(number(o['tokensIn'])),
        tokensOut: TokenCount.of(number(o['tokensOut'])),
        provider: oneOf<LLMProviderName>(o['provider'], LLM_PROVIDERS),
        ...(model !== undefined ? { model } : {}),
        generatedAt: date(o['generatedAt']),
      }),
    );
  }
  return summaries;
};

const readMindMap = (root: unknown, usage: unknown): MindMap =>
  new MindMap(
    readNode(root),
    optional(usage, (v) => {
      const o = object(v);
      return {
        model: text(o['model']),
        tokensIn: TokenCount.of(number(o['tokensIn'])),
        tokensOut: TokenCount.of(number(o['tokensOut'])),
      };
    }),
  );

const readNode = (raw: unknown): MindMapNode => {
  const o = object(raw);
  return new MindMapNode(text(o['label']), list(o['children']).map(readNode));
};

const isObject = (v: unknown): v is Json =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const object = (v: unknown): Json => {
  if (!isObject(v)) throw new Error('Expected an object');
  return v;
};

const list = (v: unknown): unknown[] => {
  if (!Array.isArray(v)) throw new Error('Expected a list');
  return v;
};

const text = (v: unknown): string => {
  if (typeof v !== 'string') throw new Error('Expected a string');
  return v;
};

const nonBlank = (v: unknown): string => {
  const value = text(v);
  if (value.trim().length === 0) throw new Error('Expected a non-blank string');
  return value;
};

const number = (v: unknown): number => {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error('Expected a number');
  return v;
};

const bool = (v: unknown): boolean => {
  if (typeof v !== 'boolean') throw new Error('Expected a boolean');
  return v;
};

const date = (v: unknown): Date => {
  const parsed = new Date(text(v));
  if (Number.isNaN(parsed.getTime())) throw new Error('Expected a date');
  return parsed;
};

const oneOf = <T extends string>(v: unknown, allowed: readonly T[]): T => {
  const value = text(v);
  const match = allowed.find((a) => a === value);
  if (match === undefined) throw new Error(`Unexpected value: ${value}`);
  return match;
};

const optional = <T>(v: unknown, read: (value: unknown) => T): T | undefined =>
  v === undefined || v === null ? undefined : read(v);

const wrongFormat = (): Result<never, AppError> =>
  failure('import_not_meeting', 'File is not a Mintza meeting file');

const failure = (reason: ErrorReason, message: string, cause?: unknown): Result<never, AppError> =>
  err(new AppError('CONFIG_INVALID', message, cause, [], reason));
