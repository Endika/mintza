import type { ClearMeetingsUseCase } from '../../application/use-cases/ClearMeetingsUseCase';
import type { DeleteMeetingUseCase } from '../../application/use-cases/DeleteMeetingUseCase';
import type { GetMeetingUseCase } from '../../application/use-cases/GetMeetingUseCase';
import type { ListMeetingsUseCase } from '../../application/use-cases/ListMeetingsUseCase';
import type { SaveMeetingUseCase } from '../../application/use-cases/SaveMeetingUseCase';
import type { MeetingListItem } from '../../domain/meeting/ports/MeetingRepository';
import { MeetingId } from '../../domain/meeting/value-objects/MeetingId';
import { Template } from '../../domain/meeting/value-objects/Template';
import { ICON_RECORD, ICON_STAR, ICON_STAR_FILLED, ICON_TRASH } from '../components/icons';
import { templateDisplayName } from '../i18n/templateDisplayName';
import type { Translator } from '../i18n/Translator';
import type { TranslationKey } from '../i18n/translations';
import type { Page } from '../router/Router';
import { escapeHtml } from '../util/escapeHtml';
import { formatDuration } from '../util/formatDuration';

export interface HistoryPageDeps {
  readonly listMeetings: ListMeetingsUseCase;
  readonly getMeeting: GetMeetingUseCase;
  readonly saveMeeting: SaveMeetingUseCase;
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

const ICON_BUTTON = 'btn-ghost size-11 shrink-0 px-0';

export class HistoryPage implements Page {
  private root: HTMLElement | null = null;
  private all: MeetingListItem[] = [];
  private query = '';
  private sort: SortMode = 'recent';

  constructor(private readonly deps: HistoryPageDeps) {}

  private get t(): Translator {
    return this.deps.translator;
  }

  async render(root: HTMLElement): Promise<void> {
    this.root = root;
    const t = this.t;
    root.innerHTML = `
      <div class="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <h1 tabindex="-1" class="mb-5 text-3xl font-semibold tracking-tight sm:mb-6 sm:text-4xl">${t.t('history.title')}</h1>
        <div id="filters" class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center hidden">
          <label for="search" class="sr-only">${t.t('history.search_label')}</label>
          <input
            type="search"
            id="search"
            placeholder="${escapeHtml(t.t('history.search_placeholder'))}"
            class="field sm:flex-1"
            autocomplete="off"
          />
          <div class="flex items-center gap-3">
            <label for="sort" class="shrink-0 text-sm font-medium">${t.t('history.sort_label')}</label>
            <select id="sort" class="field sm:w-auto">
              ${SORT_OPTIONS.map(
                (o) =>
                  `<option value="${o.value}" ${o.value === this.sort ? 'selected' : ''}>${t.t(o.labelKey)}</option>`,
              ).join('')}
            </select>
          </div>
        </div>
        <p id="history-status" class="mb-4 text-sm text-danger hidden" role="status"></p>
        <div id="list">
          <p class="text-fg-muted">${t.t('history.loading')}</p>
        </div>
        <div id="clear-row" class="mt-6 hidden">
          <button type="button" id="btn-clear" class="btn-ghost -ml-3 text-danger">${ICON_TRASH}<span>${t.t('history.clear_all')}</span></button>
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
      this.qs<HTMLElement>('#list').innerHTML = `
        <div class="card">
          <p class="font-medium text-danger">${this.t.t('history.load_failed')}</p>
          <p class="mt-1 break-words text-sm text-fg-muted">${escapeHtml(result.error.message)}</p>
        </div>`;
      return;
    }
    this.all = [...result.value];
    this.renderList();
  }

  private renderList(): void {
    const list = this.qs<HTMLElement>('#list');
    const t = this.t;
    const hasMeetings = this.all.length > 0;
    this.qs<HTMLElement>('#filters').classList.toggle('hidden', !hasMeetings);
    this.qs<HTMLElement>('#clear-row').classList.toggle('hidden', !hasMeetings);

    if (!hasMeetings) {
      list.innerHTML = `
        <div class="card flex flex-col items-start gap-4">
          <p class="text-lg font-medium">${t.t('history.empty')}</p>
          <a href="#/" class="btn-action">${ICON_RECORD}<span>${t.t('home.record_title')}</span></a>
        </div>`;
      return;
    }

    const sorted = this.applySort(this.applyFilter(this.all));
    if (sorted.length === 0) {
      list.innerHTML = `<p class="px-1 text-fg-muted">${t.t('history.no_results')}</p>`;
      return;
    }

    list.innerHTML = `<ul class="flex flex-col gap-3">${sorted.map((m) => this.rowHtml(m)).join('')}</ul>`;

    list.querySelectorAll<HTMLButtonElement>('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset['delete'];
        if (id) void this.handleDelete(id);
      });
    });
    list.querySelectorAll<HTMLButtonElement>('[data-star]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset['star'];
        if (id) void this.handleStar(id);
      });
    });
  }

  private rowHtml(m: MeetingListItem): string {
    const t = this.t;
    const id = escapeHtml(m.id.value);
    const title = escapeHtml(m.title);
    return `
      <li class="card flex items-center gap-1 p-2 sm:p-2">
        <a href="#/meeting?id=${id}" class="min-w-0 flex-1 rounded-[calc(var(--radius-card)-0.5rem)] px-3 py-2.5 transition-colors duration-150 hover:bg-raised">
          <h2 class="line-clamp-2 break-words font-semibold">${title}</h2>
          <p class="mt-0.5 text-sm text-fg-muted tabular">${this.metaHtml(m)}</p>
        </a>
        <button type="button" data-star="${id}" aria-pressed="${m.starred}" aria-label="${escapeHtml(t.t('history.star_named', { title: m.title }))}" class="${ICON_BUTTON} ${m.starred ? 'text-fg' : 'text-fg-muted'}">${m.starred ? ICON_STAR_FILLED : ICON_STAR}</button>
        <button type="button" data-delete="${id}" aria-label="${escapeHtml(t.t('history.delete_named', { title: m.title }))}" class="${ICON_BUTTON} text-fg-muted hover:text-danger">${ICON_TRASH}</button>
      </li>`;
  }

  private metaHtml(m: MeetingListItem): string {
    const lang = this.t.language;
    const when = m.startedAt.toLocaleString(lang, { dateStyle: 'medium', timeStyle: 'short' });
    return [when, formatDuration(m.durationMs / 1000, lang), this.templateLabel(m.templateKind)]
      .map(
        (part, i, all) =>
          `<span class="whitespace-nowrap">${escapeHtml(part)}${i < all.length - 1 ? ' ·' : ''}</span>`,
      )
      .join(' ');
  }

  private templateLabel(kind: string): string {
    return Template.isBuiltInId(kind) ? templateDisplayName(Template.of(kind), this.t) : kind;
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

  private async handleStar(idValue: string): Promise<void> {
    let id: MeetingId;
    try {
      id = MeetingId.restore(idValue);
    } catch {
      return;
    }
    const button = this.starButton(idValue);
    if (button) button.disabled = true;
    const starred = await this.toggleStar(id);
    if (starred === null) {
      if (button) button.disabled = false;
      return;
    }
    this.all = this.all.map((m) => (m.id.value === idValue ? { ...m, starred } : m));
    this.renderList();
    this.starButton(idValue)?.focus();
  }

  private async toggleStar(id: MeetingId): Promise<boolean | null> {
    const found = await this.deps.getMeeting.execute({ id });
    const meeting = found.ok ? found.value : null;
    if (!meeting) {
      this.setStatus(this.t.t('history.star_failed'));
      return null;
    }
    meeting.toggleStar();
    const saved = await this.deps.saveMeeting.execute({ meeting });
    if (!saved.ok) {
      this.setStatus(`${this.t.t('history.star_failed')} ${saved.error.message}`);
      return null;
    }
    return meeting.starred;
  }

  private starButton(idValue: string): HTMLButtonElement | undefined {
    return [
      ...this.qs<HTMLElement>('#list').querySelectorAll<HTMLButtonElement>('[data-star]'),
    ].find((btn) => btn.dataset['star'] === idValue);
  }

  private async handleDelete(idValue: string): Promise<void> {
    if (!window.confirm(this.t.t('history.confirm_delete'))) return;
    let id: MeetingId;
    try {
      id = MeetingId.restore(idValue);
    } catch {
      return;
    }
    const result = await this.deps.deleteMeeting.execute({ id });
    if (result.ok) {
      this.all = this.all.filter((m) => m.id.value !== idValue);
      this.renderList();
      this.qs<HTMLElement>('h1').focus();
    } else {
      this.setStatus(`${this.t.t('history.delete_failed')} ${result.error.message}`);
    }
  }

  private async handleClearAll(): Promise<void> {
    if (!window.confirm(this.t.t('history.confirm_clear'))) return;
    const result = await this.deps.clearMeetings.execute();
    if (result.ok) {
      this.all = [];
      this.renderList();
      this.qs<HTMLElement>('h1').focus();
    } else {
      this.setStatus(`${this.t.t('history.clear_failed')} ${result.error.message}`);
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
