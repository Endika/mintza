import type { Meeting } from '../entities/Meeting';
import type { SummaryKind } from '../../summary/value-objects/SummaryKind';
import { serializeMeeting } from './MeetingTransfer';

export type ExportFormat = 'markdown' | 'json' | 'txt' | 'csv';

export interface ExportedFile {
  readonly filename: string;
  readonly mimeType: string;
  readonly content: string;
}

/** A file name that every file system accepts: lowercase ASCII words joined by hyphens. */
export const exportFilename = (title: string, extension: string): string =>
  `${slug(title)}.${extension}`;

export class MeetingExporter {
  /** `title` is the one people see; it defaults to the stored title. */
  export(meeting: Meeting, format: ExportFormat, title: string = meeting.title): ExportedFile {
    switch (format) {
      case 'markdown':
        return {
          filename: exportFilename(title, 'md'),
          mimeType: 'text/markdown;charset=utf-8',
          content: this.toMarkdown(meeting, title),
        };
      case 'json':
        return {
          filename: exportFilename(title, 'json'),
          mimeType: 'application/json;charset=utf-8',
          content: serializeMeeting(meeting),
        };
      case 'txt':
        return {
          filename: exportFilename(title, 'txt'),
          mimeType: 'text/plain;charset=utf-8',
          content: this.toTxt(meeting, title),
        };
      case 'csv':
        return {
          filename: exportFilename(title, 'csv'),
          mimeType: 'text/csv;charset=utf-8',
          content: this.toCsv(meeting),
        };
    }
  }

  private toMarkdown(meeting: Meeting, title: string): string {
    const order = meeting.template.featuredSummaryOrder();
    const parts: string[] = [];
    parts.push(`# ${title}`, '');
    parts.push(`- Date: ${meeting.startedAt.toISOString()}`);
    parts.push(`- Duration: ${formatDuration(meeting.durationMs)}`);
    parts.push(`- Template: ${meeting.template.kind}`);
    parts.push(`- Language: ${meeting.language.code}`);
    if (meeting.temperature) parts.push(`- Sentiment score: ${meeting.temperature.value}`);
    parts.push('', '## Summaries', '');
    for (const kind of order) {
      const summary = meeting.summaries.get(kind);
      if (!summary) continue;
      parts.push(`### ${humanLabel(kind)}`, '', summary.content, '');
    }
    parts.push('## Transcript', '');
    for (const segment of meeting.segments) {
      parts.push(`- _[${formatDuration(segment.startMs)}]_ ${segment.text.value}`);
    }
    return parts.join('\n');
  }

  private toTxt(meeting: Meeting, title: string): string {
    const lines = [title, meeting.startedAt.toISOString(), formatDuration(meeting.durationMs), ''];
    for (const segment of meeting.segments) {
      lines.push(`[${formatDuration(segment.startMs)}] ${segment.text.value}`);
    }
    return lines.join('\n');
  }

  private toCsv(meeting: Meeting): string {
    const rows = [['startMs', 'endMs', 'provider', 'text']];
    for (const s of meeting.segments) {
      rows.push([String(s.startMs), String(s.endMs), s.provider, escapeCsv(s.text.value)]);
    }
    return rows.map((r) => r.join(',')).join('\n');
  }
}

const humanLabel = (kind: SummaryKind): string =>
  kind.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const slug = (raw: string): string =>
  raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'meeting';

const escapeCsv = (raw: string): string => {
  if (/[",\n]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
};

const formatDuration = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};
