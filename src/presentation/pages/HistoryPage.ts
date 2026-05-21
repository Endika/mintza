import type { ClearMeetingsUseCase } from '../../application/use-cases/ClearMeetingsUseCase';
import type { DeleteMeetingUseCase } from '../../application/use-cases/DeleteMeetingUseCase';
import type { ListMeetingsUseCase } from '../../application/use-cases/ListMeetingsUseCase';
import { MeetingId } from '../../domain/meeting/value-objects/MeetingId';
import type { Translator } from '../i18n/Translator';
import type { Page } from '../router/Router';

export interface HistoryPageDeps {
  readonly listMeetings: ListMeetingsUseCase;
  readonly deleteMeeting: DeleteMeetingUseCase;
  readonly clearMeetings: ClearMeetingsUseCase;
  readonly translator: Translator;
}

export class HistoryPage implements Page {
  private root: HTMLElement | null = null;

  constructor(private readonly deps: HistoryPageDeps) {}

  async render(root: HTMLElement): Promise<void> {
    this.root = root;
    const t = this.deps.translator;
    root.innerHTML = `
      <main class="mx-auto max-w-3xl px-6 py-12">
        <header class="mb-8 flex items-center justify-between gap-4">
          <h1 class="text-3xl font-bold tracking-tight">${t.t('history.title')}</h1>
          <div class="flex gap-2">
            <button id="btn-clear" class="btn-ghost text-red-600 text-sm hidden">Clear all</button>
            <a href="#/" class="btn-ghost">${t.t('nav.back')}</a>
          </div>
        </header>
        <div id="list" class="space-y-3">
          <em class="text-ink-400">${t.t('history.loading')}</em>
        </div>
      </main>
    `;
    this.qs<HTMLButtonElement>('#btn-clear').addEventListener('click', () => {
      void this.handleClearAll();
    });
    await this.refresh();
  }

  private async refresh(): Promise<void> {
    const list = this.qs<HTMLElement>('#list');
    const clearBtn = this.qs<HTMLButtonElement>('#btn-clear');
    const t = this.deps.translator;
    const result = await this.deps.listMeetings.execute();
    if (!result.ok) {
      list.innerHTML = `<p class="text-red-600">Error: ${result.error.message}</p>`;
      clearBtn.classList.add('hidden');
      return;
    }
    if (result.value.length === 0) {
      list.innerHTML = `<em class="text-ink-400">${t.t('history.empty')}</em>`;
      clearBtn.classList.add('hidden');
      return;
    }
    clearBtn.classList.remove('hidden');
    list.innerHTML = result.value
      .map(
        (m) => `
        <article class="card flex items-center justify-between gap-3">
          <a href="#/meeting?id=${m.id.value}" class="flex-1 -m-2 p-2 rounded-md hover:bg-ink-50 transition-colors">
            <h3 class="font-semibold">${escapeHtml(m.title)}</h3>
            <p class="text-sm text-ink-400">
              ${m.startedAt.toLocaleString()} · ${Math.round(m.durationMs / 1000)}s · ${m.templateKind}
            </p>
          </a>
          <div class="flex items-center gap-2 shrink-0">
            ${m.starred ? '<span title="Starred">★</span>' : ''}
            <button type="button" data-delete="${m.id.value}" class="btn-ghost text-red-600 text-xs" aria-label="Delete meeting">✕</button>
          </div>
        </article>`,
      )
      .join('');

    list.querySelectorAll<HTMLButtonElement>('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset['delete'];
        if (id) void this.handleDelete(id);
      });
    });
  }

  private async handleDelete(idValue: string): Promise<void> {
    if (!window.confirm('Delete this meeting?')) return;
    try {
      const id = MeetingId.restore(idValue);
      const result = await this.deps.deleteMeeting.execute({ id });
      if (result.ok) await this.refresh();
    } catch {
      // invalid id; ignore
    }
  }

  private async handleClearAll(): Promise<void> {
    if (!window.confirm('Delete ALL meetings? This cannot be undone.')) return;
    const result = await this.deps.clearMeetings.execute();
    if (result.ok) await this.refresh();
  }

  private qs<T extends HTMLElement>(selector: string): T {
    if (!this.root) throw new Error('HistoryPage not rendered yet');
    const el = this.root.querySelector<T>(selector);
    if (!el) throw new Error(`Missing element ${selector}`);
    return el;
  }
}

const escapeHtml = (raw: string): string =>
  raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
