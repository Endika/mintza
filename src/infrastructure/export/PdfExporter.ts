import type { jsPDF as JsPDFType } from 'jspdf';
import type { Meeting } from '../../domain/meeting/entities/Meeting';

const PAGE_MARGIN = 14;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const LINE_HEIGHT = 6;

export class PdfExporter {
  async generate(meeting: Meeting): Promise<Blob> {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    let y = PAGE_MARGIN;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    y = this.writeWrapped(doc, meeting.title, y, 18, 'bold');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(120);
    y = this.writeLine(
      doc,
      `${meeting.startedAt.toISOString()} · ${formatDuration(meeting.durationMs)} · ${meeting.template.kind}`,
      y + 2,
    );
    if (meeting.temperature) {
      y = this.writeLine(doc, `Sentiment score: ${meeting.temperature.value}`, y);
    }
    doc.setTextColor(0);
    y += 4;

    const order = meeting.template.featuredSummaryOrder();
    for (const kind of order) {
      const summary = meeting.summaries.get(kind);
      if (!summary) continue;
      y = this.ensureRoom(doc, y, 20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      y = this.writeLine(doc, humanLabel(kind), y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      y = this.writeWrapped(doc, summary.content, y, 11, 'normal');
      y += 4;
    }

    if (meeting.segments.length > 0) {
      y = this.ensureRoom(doc, y, 20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      y = this.writeLine(doc, 'Transcript', y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      for (const segment of meeting.segments) {
        y = this.ensureRoom(doc, y, LINE_HEIGHT * 2);
        y = this.writeWrapped(
          doc,
          `[${formatDuration(segment.startMs)}] ${segment.text.value}`,
          y,
          10,
          'normal',
        );
      }
    }

    return doc.output('blob');
  }

  private writeLine(doc: JsPDFType, text: string, y: number): number {
    doc.text(text, PAGE_MARGIN, y);
    return y + LINE_HEIGHT;
  }

  private writeWrapped(
    doc: JsPDFType,
    text: string,
    y: number,
    fontSize: number,
    _style: string,
  ): number {
    const width = PAGE_WIDTH - PAGE_MARGIN * 2;
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, width) as string[];
    let cursor = y;
    for (const line of lines) {
      cursor = this.ensureRoom(doc, cursor, LINE_HEIGHT);
      doc.text(line, PAGE_MARGIN, cursor);
      cursor += LINE_HEIGHT;
    }
    return cursor;
  }

  private ensureRoom(doc: JsPDFType, y: number, needed: number): number {
    if (y + needed > PAGE_HEIGHT - PAGE_MARGIN) {
      doc.addPage();
      return PAGE_MARGIN;
    }
    return y;
  }
}

const humanLabel = (kind: string): string =>
  kind.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const formatDuration = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};
