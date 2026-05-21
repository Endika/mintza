import type { Meeting } from '../../domain/meeting/entities/Meeting';
import {
  MeetingExporter,
  type ExportFormat,
} from '../../domain/meeting/services/MeetingExporter';

const FORMATS: ReadonlyArray<{ value: ExportFormat; label: string }> = [
  { value: 'markdown', label: 'Markdown' },
  { value: 'json', label: 'JSON' },
  { value: 'txt', label: 'TXT' },
  { value: 'csv', label: 'CSV' },
];

export class ExportMenu {
  private readonly exporter = new MeetingExporter();

  render(target: HTMLElement, getMeeting: () => Meeting | null): void {
    target.innerHTML = `
      <div class="flex flex-wrap items-center gap-2 text-sm">
        <span class="text-ink-400">Export:</span>
        ${FORMATS.map(
          (f) =>
            `<button type="button" data-export="${f.value}" class="btn-ghost text-sm">${f.label}</button>`,
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
