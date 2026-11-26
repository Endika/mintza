import type { ClearMeetingsUseCase } from '../../application/use-cases/ClearMeetingsUseCase';
import type { DeleteMeetingUseCase } from '../../application/use-cases/DeleteMeetingUseCase';
import type { GetMeetingUseCase } from '../../application/use-cases/GetMeetingUseCase';
import type {
  ImportMeetingUseCase,
  ImportPreview,
  TemplateChoice,
} from '../../application/use-cases/ImportMeetingUseCase';
import type { ListMeetingsUseCase } from '../../application/use-cases/ListMeetingsUseCase';
import type { ListTemplatesUseCase } from '../../application/use-cases/ListTemplatesUseCase';
import type { SaveMeetingUseCase } from '../../application/use-cases/SaveMeetingUseCase';
import type { MeetingListItem } from '../../domain/meeting/ports/MeetingRepository';
import { MeetingId } from '../../domain/meeting/value-objects/MeetingId';
import { Template } from '../../domain/meeting/value-objects/Template';
import { ICON_RECORD, ICON_STAR, ICON_STAR_FILLED, ICON_TRASH } from '../components/icons';
import { errorText } from '../i18n/errorText';
import { templateDisplayName } from '../i18n/templateDisplayName';
import type { Translator } from '../i18n/Translator';
import type { TranslationKey } from '../i18n/translations';
import { Router, type Page } from '../router/Router';
import { BADGE } from '../util/badge';
import { escapeHtml } from '../util/escapeHtml';
import { formatDuration } from '../util/formatDuration';
import { meetingTitle } from '../util/meetingTitle';
import { defaultImportOption, toTemplateChoice, type ImportOption } from '../util/importChoice';
import { metaLine } from '../util/metaLine';
import { pickTextFile } from '../util/pickTextFile';

export interface HistoryPageDeps {
  readonly listMeetings: ListMeetingsUseCase;
  readonly listTemplates: Pick<ListTemplatesUseCase, 'execute'>;
  readonly getMeeting: GetMeetingUseCase;
  readonly saveMeeting: SaveMeetingUseCase;
  readonly deleteMeeting: DeleteMeetingUseCase;
  readonly clearMeetings: ClearMeetingsUseCase;
  readonly importMeeting: Pick<ImportMeetingUseCase, 'inspect' | 'execute'>;
  readonly translator: Translator;
  readonly pickFile?: () => Promise<string | null>;
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
  private templates: readonly Template[] = [];
  private query = '';
  private sort: SortMode = 'recent';

  private readonly pickFile: () => Promise<string | null>;

  constructor(private readonly deps: HistoryPageDeps) {
    this.pickFile = deps.pickFile ?? (() => pickTextFile());
  }

  private get t(): Translator {
    return this.deps.translator;
  }

  async render(root: HTMLElement): Promise<void> {
    this.root = root;
    const t = this.t;
    root.innerHTML = `
      <div class="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <header class="mb-5 flex flex-wrap items-center justify-between gap-3 sm:mb-6">
          <h1 tabindex="-1" class="min-w-0 break-words text-3xl font-semibold tracking-tight sm:text-4xl">${t.t('history.title')}</h1>
          <button id="btn-import" type="button" class="btn-secondary">${t.t('history.import')}</button>
        </header>
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
        <p id="history-status" class="mb-4 text-sm text-danger empty:sr-only" role="status"></p>
        <div id="import-slot"></div>
        <div id="list">
          <p class="text-fg-muted">${t.t('history.loading')}</p>
        </div>
        <div id="clear-row" class="mt-6 hidden">
          <button type="button" id="btn-clear" class="btn-ghost -ml-3 text-danger">${ICON_TRASH}<span>${t.t('history.clear_all')}</span></button>
        </div>
      </div>
    `;
    this.qs<HTMLButtonElement>('#btn-import').addEventListener(
      'click',
      () => void this.handleImport(),
    );
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
    const [result, templates] = await Promise.all([
      this.deps.listMeetings.execute(),
      this.deps.listTemplates.execute(),
    ]);
    if (templates.ok) this.templates = templates.value;
    if (!result.ok) {
      this.qs<HTMLElement>('#list').innerHTML = `
        <div class="card">
          <p class="font-medium text-danger">${this.t.t('history.load_failed')}</p>
          <p class="mt-1 break-words text-sm text-fg-muted">${errorText(result.error, this.t)}</p>
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
    const display = meetingTitle(m, t);
    const title = escapeHtml(display);
    return `
      <li class="card flex items-center gap-1 p-2 sm:p-2">
        <a href="#/meeting?id=${id}" class="min-w-0 flex-1 rounded-[calc(var(--radius-card)-0.5rem)] px-3 py-2.5 transition-colors duration-150 hover:bg-raised">
          <h2 class="line-clamp-2 break-words font-semibold">${title}</h2>
          <p class="mt-0.5 text-sm text-fg-muted tabular">${this.metaHtml(m)}</p>
          ${m.imported ? `<p class="mt-1.5"><span class="${BADGE}">${t.t('meeting.imported')}</span></p>` : ''}
        </a>
        <button type="button" data-star="${id}" aria-pressed="${m.starred}" aria-label="${escapeHtml(t.t('history.star_named', { title: display }))}" class="${ICON_BUTTON} ${m.starred ? 'text-fg' : 'text-fg-muted'}">${m.starred ? ICON_STAR_FILLED : ICON_STAR}</button>
        <button type="button" data-delete="${id}" aria-label="${escapeHtml(t.t('history.delete_named', { title: display }))}" class="${ICON_BUTTON} text-fg-muted hover:text-danger">${ICON_TRASH}</button>
      </li>`;
  }

  private metaHtml(m: MeetingListItem): string {
    const lang = this.t.language;
    const when = m.startedAt.toLocaleString(lang, { dateStyle: 'medium', timeStyle: 'short' });
    const parts = [when, formatDuration(m.durationMs / 1000, lang)];
    const template = this.templateLabel(m.templateKind);
    if (template) parts.push(template);
    return metaLine(parts);
  }

  /** A deleted custom template has no name left to show, and its id means nothing to people. */
  private templateLabel(kind: string): string {
    const template =
      this.templates.find((tpl) => tpl.id === kind) ??
      (Template.isBuiltInId(kind) ? Template.of(kind) : undefined);
    return template ? templateDisplayName(template, this.t) : '';
  }

  private applyFilter(items: readonly MeetingListItem[]): MeetingListItem[] {
    if (this.query.length === 0) return [...items];
    return items.filter(
      (m) =>
        meetingTitle(m, this.t).toLowerCase().includes(this.query) ||
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
        return sorted.sort((a, b) =>
          meetingTitle(a, this.t).localeCompare(meetingTitle(b, this.t)),
        );
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
      this.setStatus(`${this.t.t('history.star_failed')} ${errorText(saved.error, this.t)}`);
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
      this.setStatus(`${this.t.t('history.delete_failed')} ${errorText(result.error, this.t)}`);
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
      this.setStatus(`${this.t.t('history.clear_failed')} ${errorText(result.error, this.t)}`);
    }
  }

  private async handleImport(): Promise<void> {
    const text = await this.pickFile();
    if (text === null) return;
    this.setStatus('');
    this.closeImportCard();
    const preview = await this.deps.importMeeting.inspect(text);
    if (!preview.ok) {
      this.setStatus(errorText(preview.error, this.t));
      return;
    }
    if (preview.value.templateAvailable) {
      await this.runImport(preview.value, { kind: 'as-is' });
      return;
    }
    this.openImportCard(preview.value);
  }

  private async runImport(preview: ImportPreview, choice: TemplateChoice): Promise<void> {
    const t = this.t;
    const result = await this.deps.importMeeting.execute({
      parsed: preview.parsed,
      choice,
      titleSuffix: t.t('meeting.imported_suffix'),
      copySuffix: t.t('templates.copy_suffix'),
    });
    if (!result.ok) {
      this.setStatus(errorText(result.error, t));
      return;
    }
    const { regenerated, successCount, failureCount, mindMapFailed } = result.value;
    const failed = failureCount + (mindMapFailed ? 1 : 0);
    if (regenerated && failed > 0) {
      // Staying here keeps the message visible; the saved meeting shows up in the list.
      this.closeImportCard();
      await this.load();
      this.setStatus(t.t('home.summaries_result', { ok: successCount, failed }));
      return;
    }
    Router.navigate(`/meeting?id=${encodeURIComponent(result.value.meetingId.value)}`);
  }

  private openImportCard(preview: ImportPreview): void {
    const t = this.t;
    const option = defaultImportOption(preview.canRecreate);
    const choiceRow = (value: ImportOption, label: string, hint: string, extra = ''): string => `
      <label class="flex min-h-11 cursor-pointer items-start gap-3 py-3">
        <input type="radio" name="import-option" value="${value}" class="mt-1 size-4 shrink-0 accent-action" ${value === option ? 'checked' : ''} />
        <span class="min-w-0 flex-1">
          <span class="block font-semibold">${label}</span>
          <span class="mt-0.5 block text-sm text-fg-muted">${hint}</span>
          ${extra}
        </span>
      </label>`;
    const select = `
      <select id="import-template" class="field mt-2" aria-label="${escapeHtml(t.t('history.import_use'))}">
        ${this.templates.map((tpl) => `<option value="${escapeHtml(tpl.id)}">${escapeHtml(templateDisplayName(tpl, this.t))}</option>`).join('')}
      </select>`;
    const slot = this.qs<HTMLElement>('#import-slot');
    slot.innerHTML = `
      <section id="import-card" class="card mb-4" aria-labelledby="import-title">
        <h2 id="import-title" class="font-semibold">${t.t('history.import_missing_title')}</h2>
        <fieldset class="mt-2 min-w-0 divide-y divide-line">
          ${preview.canRecreate ? choiceRow('recreate', t.t('history.import_recreate'), t.t('history.import_recreate_hint')) : ''}
          ${choiceRow('use', t.t('history.import_use'), t.t('history.import_use_hint'), select)}
        </fieldset>
        <div class="mt-3 flex flex-wrap gap-2">
          <button type="button" id="import-confirm" class="btn-action">${t.t('history.import_confirm')}</button>
          <button type="button" id="import-cancel" class="btn-ghost">${t.t('history.import_cancel')}</button>
        </div>
      </section>`;
    this.qs<HTMLButtonElement>('#import-cancel').addEventListener('click', () =>
      this.closeImportCard(),
    );
    this.qs<HTMLButtonElement>('#import-confirm').addEventListener(
      'click',
      () => void this.confirmImport(preview),
    );
  }

  private async confirmImport(preview: ImportPreview): Promise<void> {
    const picked = this.qs<HTMLElement>('#import-card').querySelector<HTMLInputElement>(
      'input[name="import-option"]:checked',
    );
    const templateId = this.qs<HTMLSelectElement>('#import-template').value;
    const option: ImportOption = picked?.value === 'recreate' ? 'recreate' : 'use';
    const confirm = this.qs<HTMLButtonElement>('#import-confirm');
    confirm.disabled = true;
    confirm.textContent = this.t.t(option === 'use' ? 'meeting.regenerating' : 'history.importing');
    this.setStatus('');
    await this.runImport(preview, toTemplateChoice(option, templateId));
    const stillThere = this.root?.querySelector<HTMLButtonElement>('#import-confirm');
    if (stillThere) {
      stillThere.disabled = false;
      stillThere.textContent = this.t.t('history.import_confirm');
    }
  }

  private closeImportCard(): void {
    this.qs<HTMLElement>('#import-slot').innerHTML = '';
  }

  private setStatus(message: string): void {
    const el = this.qs<HTMLElement>('#history-status');
    el.textContent = message;
  }

  private qs<T extends HTMLElement>(selector: string): T {
    if (!this.root) throw new Error('HistoryPage not rendered yet');
    const el = this.root.querySelector<T>(selector);
    if (!el) throw new Error(`Missing element ${selector}`);
    return el;
  }
}
