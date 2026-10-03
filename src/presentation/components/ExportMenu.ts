import type { Meeting } from '../../domain/meeting/entities/Meeting';
import { MeetingExporter, type ExportFormat } from '../../domain/meeting/services/MeetingExporter';
import { PdfExporter } from '../../infrastructure/export/PdfExporter';
import type { Translator } from '../i18n/Translator';
import { ICON_DOWNLOAD } from './icons';
import type { TranslationKey } from '../i18n/translations';

type Format = ExportFormat | 'pdf';

const FORMATS: ReadonlyArray<{ value: Format; labelKey: TranslationKey }> = [
  { value: 'pdf', labelKey: 'export.pdf' },
  { value: 'markdown', labelKey: 'export.markdown' },
  { value: 'json', labelKey: 'export.json' },
  { value: 'txt', labelKey: 'export.txt' },
  { value: 'csv', labelKey: 'export.csv' },
];

export class ExportMenu {
  private readonly exporter = new MeetingExporter();
  private readonly pdfExporter = new PdfExporter();
  private outsideClick: AbortController | null = null;
  private disposed = false;

  render(target: HTMLElement, getMeeting: () => Meeting | null, translator: Translator): void {
    target.innerHTML = `
      <details class="relative inline-block">
        <summary class="btn-secondary list-none [&::-webkit-details-marker]:hidden">
          ${ICON_DOWNLOAD}<span>${translator.t('export.label')}</span>
        </summary>
        <ul class="card absolute bottom-full left-0 z-30 mb-2 flex min-w-44 flex-col border border-line p-1.5 shadow-lg sm:p-1.5">
          ${FORMATS.map(
            (f) =>
              `<li><button type="button" data-export="${f.value}" class="btn-ghost w-full justify-start">${translator.t(f.labelKey)}</button></li>`,
          ).join('')}
        </ul>
      </details>
    `;
    const menu = target.querySelector<HTMLDetailsElement>('details');
    this.outsideClick?.abort();
    // A page still rendering after it was left must not attach a listener nobody removes.
    if (this.disposed) return;
    this.outsideClick = new AbortController();
    document.addEventListener(
      'click',
      (e) => {
        if (menu?.open && !menu.contains(e.target as Node)) menu.open = false;
      },
      { signal: this.outsideClick.signal },
    );
    menu?.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !menu.open) return;
      menu.open = false;
      menu.querySelector<HTMLElement>('summary')?.focus();
    });
    target.querySelectorAll<HTMLButtonElement>('[data-export]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const meeting = getMeeting();
        if (!meeting) return;
        const format = btn.dataset['export'] as Format;
        void this.download(meeting, format, btn).finally(() => {
          if (menu) menu.open = false;
        });
      });
    });
  }

  dispose(): void {
    this.disposed = true;
    this.outsideClick?.abort();
    this.outsideClick = null;
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
