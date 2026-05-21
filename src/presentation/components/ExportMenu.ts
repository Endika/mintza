import type { Meeting } from '../../domain/meeting/entities/Meeting';
import {
  MeetingExporter,
  type ExportFormat,
} from '../../domain/meeting/services/MeetingExporter';
import type { Translator } from '../i18n/Translator';
import type { TranslationKey } from '../i18n/translations';

const FORMATS: ReadonlyArray<{ value: ExportFormat; labelKey: TranslationKey }> = [
  { value: 'markdown', labelKey: 'export.markdown' },
  { value: 'json', labelKey: 'export.json' },
  { value: 'txt', labelKey: 'export.txt' },
  { value: 'csv', labelKey: 'export.csv' },
];

export class ExportMenu {
  private readonly exporter = new MeetingExporter();

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
            `<button type="button" data-export="${f.value}" class="btn-ghost text-sm">${translator.t(f.labelKey)}</button>`,
        ).join('')}
      </div>
    `;
    target.querySelectorAll<HTMLButtonElement>('[data-export]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const meeting = getMeeting();
        if (!meeting) return;
        const format = btn.dataset['export'] as ExportFormat;
        this.download(meeting, format);
      });
    });
  }

  private download(meeting: Meeting, format: ExportFormat): void {
    const file = this.exporter.export(meeting, format);
    const blob = new Blob([file.content], { type: file.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
