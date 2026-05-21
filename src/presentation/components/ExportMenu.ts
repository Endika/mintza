import type { Meeting } from '../../domain/meeting/entities/Meeting';
import {
  MeetingExporter,
  type ExportFormat,
} from '../../domain/meeting/services/MeetingExporter';
import { PdfExporter } from '../../infrastructure/export/PdfExporter';
import type { Translator } from '../i18n/Translator';
import type { TranslationKey } from '../i18n/translations';

type Format = ExportFormat | 'pdf';

const FORMATS: ReadonlyArray<{ value: Format; label: string; labelKey?: TranslationKey }> = [
  { value: 'pdf', label: 'PDF' },
  { value: 'markdown', label: 'Markdown', labelKey: 'export.markdown' },
  { value: 'json', label: 'JSON', labelKey: 'export.json' },
  { value: 'txt', label: 'TXT', labelKey: 'export.txt' },
  { value: 'csv', label: 'CSV', labelKey: 'export.csv' },
];

export class ExportMenu {
  private readonly exporter = new MeetingExporter();
  private readonly pdfExporter = new PdfExporter();

  render(
    target: HTMLElement,
    getMeeting: () => Meeting | null,
    translator: Translator,
  ): void {
    target.innerHTML = `
      <div class="flex flex-wrap items-center gap-2 text-sm">
        <span class="text-ink-400">${translator.t('export.label')}</span>
        ${FORMATS.map(
          (f) =>
            `<button type="button" data-export="${f.value}" class="btn-ghost text-sm">${f.labelKey ? translator.t(f.labelKey) : f.label}</button>`,
        ).join('')}
      </div>
    `;
    target.querySelectorAll<HTMLButtonElement>('[data-export]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const meeting = getMeeting();
        if (!meeting) return;
        const format = btn.dataset['export'] as Format;
        void this.download(meeting, format, btn);
      });
    });
  }

  private async download(meeting: Meeting, format: Format, btn: HTMLButtonElement): Promise<void> {
    if (format === 'pdf') {
      btn.disabled = true;
      try {
        const blob = await this.pdfExporter.generate(meeting);
        triggerDownload(blob, `${slugify(meeting.title)}.pdf`);
      } finally {
        btn.disabled = false;
      }
      return;
    }
    const file = this.exporter.export(meeting, format);
    const blob = new Blob([file.content], { type: file.mimeType });
    triggerDownload(blob, file.filename);
  }
}

const triggerDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const slugify = (raw: string): string =>
  raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'meeting';
