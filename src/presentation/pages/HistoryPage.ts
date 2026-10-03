import type { ClearMeetingsUseCase } from '../../application/use-cases/ClearMeetingsUseCase';
import type { DeleteMeetingUseCase } from '../../application/use-cases/DeleteMeetingUseCase';
import type { ListMeetingsUseCase } from '../../application/use-cases/ListMeetingsUseCase';
import type { MeetingListItem } from '../../domain/meeting/ports/MeetingRepository';
import { MeetingId } from '../../domain/meeting/value-objects/MeetingId';
import { Template } from '../../domain/meeting/value-objects/Template';
import { templateDisplayName } from '../i18n/templateDisplayName';
import type { Translator } from '../i18n/Translator';
import type { TranslationKey } from '../i18n/translations';
import type { Page } from '../router/Router';
import { escapeHtml } from '../util/escapeHtml';

export interface HistoryPageDeps {
  readonly listMeetings: ListMeetingsUseCase;
  readonly deleteMeeting: DeleteMeetingUseCase;
  readonly clearMeetings: ClearMeetingsUseCase;
  readonly translator: Translator;
}

type SortMode = 'recent' | 'oldest' | 'longest' | 'title';

const SORT_OPTIONS: ReadonlyArray<{ value: SortMode; labelKey: TranslationKey }> = [
  { value: 'recent', labelKey: 'history.sort_recent' },
  { value: 'oldest', labelKey: 'history.sort_oldest' },
  { value: 'longest', labelKey: 'history.sort_longest' },
  { value: 'title', labelKey: 'history.sort_title' },
];

export class HistoryPage implements Page {
  private root: HTMLElement | null = null;
  private all: MeetingListItem[] = [];
  private query = '';
  private sort: SortMode = 'recent';

  constructor(private readonly deps: HistoryPageDeps) {}

  async render(root: HTMLElement): Promise<void> {
    this.root = root;
    const t = this.deps.translator;
    root.innerHTML = `
      <div class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <header class="mb-6 flex items-center justify-between gap-4">
          <h1 class="text-3xl font-bold tracking-tight">${t.t('history.title')}</h1>
          <button id="btn-clear" class="btn-ghost text-danger text-sm hidden">${t.t('history.clear_all')}</button>
        </header>
        <div id="filters" class="mb-4 grid gap-3 sm:grid-cols-[1fr_auto] hidden">
          <input
            type="search"
            id="search"
            placeholder="${t.t('history.search_placeholder')}"
            class="rounded-lg border border-edge px-3 py-2 text-sm"
            autocomplete="off"
          />
          <label class="flex items-center gap-2 text-sm">
            <span class="text-fg-muted">${t.t('history.sort_label')}</span>
            <select id="sort" class="rounded-lg border border-edge px-2 py-2 text-sm">
              ${SORT_OPTIONS.map(
                (o) =>
                  `<option value="${o.value}" ${o.value === this.sort ? 'selected' : ''}>${t.t(o.labelKey)}</option>`,
              ).join('')}
            </select>
          </label>
        </div>
        <p id="history-status" class="mb-4 text-sm text-danger hidden" role="status"></p>
        <div id="list" class="space-y-3">
          <em class="text-fg-muted">${t.t('history.loading')}</em>
        </div>
      </div>
    `;
    this.qs<HTMLButtonElement>('#btn-clear').addEventListener('click', () => {
      void this.handleClearAll();
    });
    this.qs<HTMLInputElement>('#search').addEventListener('input', (e) => {
      this.query = (e.target as HTMLInputElement).value.trim().toLowerCase();
      this.renderList();
    });
    this.qs<HTMLSelectElement>('#sort').addEventListener('change', (e) => {
      this.sort = (e.target as HTMLSelectElement).value as SortMode;
      this.renderList();
    });
    await this.load();
  }

  private async load(): Promise<void> {
    const result = await this.deps.listMeetings.execute();
    if (!result.ok) {
      this.qs<HTMLElement>('#list').innerHTML =
        `<p class="text-danger">${this.deps.translator.t('history.load_failed')} ${escapeHtml(result.error.message)}</p>`;
      this.qs<HTMLButtonElement>('#btn-clear').classList.add('hidden');
      this.qs<HTMLElement>('#filters').classList.add('hidden');
      return;
    }
    this.all = [...result.value];
    this.renderList();
  }

  private renderList(): void {
    const list = this.qs<HTMLElement>('#list');
    const clearBtn = this.qs<HTMLButtonElement>('#btn-clear');
    const filters = this.qs<HTMLElement>('#filters');
    const t = this.deps.translator;

    if (this.all.length === 0) {
      list.innerHTML = `<em class="text-fg-muted">${t.t('history.empty')}</em>`;
      clearBtn.classList.add('hidden');
      filters.classList.add('hidden');
      return;
    }
    filters.classList.remove('hidden');
    clearBtn.classList.remove('hidden');

    const filtered = this.applyFilter(this.all);
    const sorted = this.applySort(filtered);

    if (sorted.length === 0) {
      list.innerHTML = `<em class="text-fg-muted">${t.t('history.no_results')}</em>`;
      return;
    }

    list.innerHTML = sorted
      .map(
        (m) => `
        <article class="card flex items-center justify-between gap-3">
          <a href="#/meeting?id=${escapeHtml(m.id.value)}" class="flex-1 -m-2 p-2 rounded-md hover:bg-raised transition-colors">
            <h2 class="font-semibold">${escapeHtml(m.title)}</h2>
            <p class="text-sm text-fg-muted">
              ${m.startedAt.toLocaleString()} · ${Math.round(m.durationMs / 1000)}s · ${escapeHtml(this.templateLabel(m.templateKind))}
            </p>
          </a>
          <div class="flex items-center gap-2 shrink-0">
            ${m.starred ? `<span title="${t.t('history.starred')}">★</span>` : ''}
            <button type="button" data-delete="${escapeHtml(m.id.value)}" class="btn-ghost text-danger text-xs" aria-label="${escapeHtml(t.t('history.delete_named', { title: m.title }))}">✕</button>
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

  private templateLabel(kind: string): string {
    return Template.isBuiltInId(kind)
      ? templateDisplayName(Template.of(kind), this.deps.translator)
      : kind;
  }

  private applyFilter(items: readonly MeetingListItem[]): MeetingListItem[] {
    if (this.query.length === 0) return [...items];
    return items.filter(
      (m) =>
        m.title.toLowerCase().includes(this.query) ||
        m.templateKind.toLowerCase().includes(this.query) ||
        this.templateLabel(m.templateKind).toLowerCase().includes(this.query),
    );
  }

  private applySort(items: MeetingListItem[]): MeetingListItem[] {
    const sorted = [...items];
    switch (this.sort) {
      case 'recent':
        return sorted.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
      case 'oldest':
        return sorted.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
      case 'longest':
        return sorted.sort((a, b) => b.durationMs - a.durationMs);
      case 'title':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
    }
  }

  private async handleDelete(idValue: string): Promise<void> {
    if (!window.confirm(this.deps.translator.t('history.confirm_delete'))) return;
    try {
      const id = MeetingId.restore(idValue);
      const result = await this.deps.deleteMeeting.execute({ id });
      if (result.ok) {
        this.all = this.all.filter((m) => m.id.value !== idValue);
        this.renderList();
      } else {
        this.setStatus(
          `${this.deps.translator.t('history.delete_failed')} ${result.error.message}`,
        );
      }
    } catch {
      // invalid id; ignore
    }
  }

  private async handleClearAll(): Promise<void> {
    if (!window.confirm(this.deps.translator.t('history.confirm_clear'))) return;
    const result = await this.deps.clearMeetings.execute();
    if (result.ok) {
      this.all = [];
      this.renderList();
    } else {
      this.setStatus(`${this.deps.translator.t('history.clear_failed')} ${result.error.message}`);
    }
  }

  private setStatus(message: string): void {
    const el = this.qs<HTMLElement>('#history-status');
    el.textContent = message;
    el.classList.remove('hidden');
  }

  private qs<T extends HTMLElement>(selector: string): T {
    if (!this.root) throw new Error('HistoryPage not rendered yet');
    const el = this.root.querySelector<T>(selector);
    if (!el) throw new Error(`Missing element ${selector}`);
    return el;
  }
}
