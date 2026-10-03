import type { DeleteTemplateUseCase } from '../../application/use-cases/DeleteTemplateUseCase';
import type { ListMeetingsUseCase } from '../../application/use-cases/ListMeetingsUseCase';
import type { ListTemplatesUseCase } from '../../application/use-cases/ListTemplatesUseCase';
import type { SaveTemplateUseCase } from '../../application/use-cases/SaveTemplateUseCase';
import {
  BUILT_IN_TEMPLATES,
  type Template,
  type TemplateDefinition,
} from '../../domain/meeting/value-objects/Template';
import { defaultInstructionFor } from '../../domain/summary/services/SummaryDefaults';
import { SUMMARY_KINDS, type SummaryKind } from '../../domain/summary/value-objects/SummaryKind';
import {
  ICON_BACK,
  ICON_CHEVRON,
  ICON_PLUS,
  ICON_STAR_FILLED,
  ICON_TRASH,
} from '../components/icons';
import { SUMMARY_LABEL_KEYS } from '../i18n/summaryLabelKey';
import { templateDisplayName } from '../i18n/templateDisplayName';
import type { Translator } from '../i18n/Translator';
import type { Confirm } from '../lifecycle/LeaveGuard';
import type { Page } from '../router/Router';
import { escapeHtml } from '../util/escapeHtml';

export interface TemplatesPageDeps {
  readonly listTemplates: ListTemplatesUseCase;
  readonly listMeetings: ListMeetingsUseCase;
  readonly saveTemplate: SaveTemplateUseCase;
  readonly deleteTemplate: DeleteTemplateUseCase;
  readonly translator: Translator;
  readonly confirm?: Confirm;
}

const BADGE = 'rounded-full bg-raised px-2.5 py-0.5 text-xs font-semibold text-fg';

export class TemplatesPage implements Page {
  private root: HTMLElement | null = null;
  private templates: Template[] = [];
  private usageById: Map<string, number> = new Map();
  private editing: TemplateDefinition | null = null;
  /** Active results, main result first: this order is saved as featuredOrder. */
  private order: SummaryKind[] = [];
  private readonly confirm: Confirm;

  constructor(private readonly deps: TemplatesPageDeps) {
    this.confirm = deps.confirm ?? ((m) => window.confirm(m));
  }

  async render(root: HTMLElement): Promise<void> {
    this.root = root;
    const t = this.deps.translator;
    root.innerHTML = `
      <div class="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <a id="back-settings" href="#/settings" class="btn-ghost -ml-3 mb-2">${ICON_BACK}<span>${t.t('nav.settings')}</span></a>
        <button id="back-list" type="button" class="btn-ghost -ml-3 mb-2 hidden">${ICON_BACK}<span>${t.t('templates.title')}</span></button>
        <header class="mb-5 flex flex-wrap items-center justify-between gap-3 sm:mb-6">
          <h1 id="page-title" tabindex="-1" class="min-w-0 break-words text-3xl font-semibold tracking-tight sm:text-4xl">${t.t('templates.title')}</h1>
          <button id="btn-new" type="button" class="btn-action">${ICON_PLUS}<span>${t.t('templates.new')}</span></button>
        </header>
        <p id="list-status" role="status" class="mb-4 text-sm text-danger empty:hidden"></p>
        <div id="list" class="flex flex-col gap-3"></div>
        <div id="editor" class="hidden"></div>
      </div>
    `;
    this.qs<HTMLButtonElement>('#btn-new').addEventListener('click', () => this.openEditor(null));
    this.qs<HTMLButtonElement>('#back-list').addEventListener('click', () => this.closeEditor());
    await this.refresh();
  }

  private async refresh(): Promise<void> {
    const [templatesResult, meetingsResult] = await Promise.all([
      this.deps.listTemplates.execute(),
      this.deps.listMeetings.execute(),
    ]);
    if (!templatesResult.ok) {
      this.qs<HTMLElement>('#list').innerHTML =
        `<p class="text-danger">${this.deps.translator.t('templates.load_failed')} ${escapeHtml(templatesResult.error.message)}</p>`;
      return;
    }
    this.templates = templatesResult.value;
    this.usageById = new Map();
    if (meetingsResult.ok) {
      for (const m of meetingsResult.value) {
        this.usageById.set(m.templateKind, (this.usageById.get(m.templateKind) ?? 0) + 1);
      }
    }
    this.renderList();
  }

  private renderList(): void {
    const list = this.qs<HTMLElement>('#list');
    const t = this.deps.translator;
    list.innerHTML = this.templates
      .map((tpl, i) => {
        const usage = this.usageById.get(tpl.id) ?? 0;
        const inUse = !tpl.builtIn && usage > 0;
        const count = tpl.summaryKinds.length;
        const usageId = `tpl-usage-${i}`;
        const usageText = inUse
          ? t.t('templates.in_use_block', { count: usage })
          : usage > 0
            ? t.t('templates.used_in', { count: usage })
            : '';
        return `
          <article class="card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 class="min-w-0 break-words text-lg font-semibold">${escapeHtml(templateDisplayName(tpl, t))}</h2>
                ${tpl.builtIn ? `<span class="${BADGE}">${t.t('templates.builtin')}</span>` : ''}
              </div>
              <p class="mt-1 text-sm text-fg-muted">${
                count === 1
                  ? t.t('templates.result_count_one')
                  : t.t('templates.result_count', { count })
              }</p>
              ${usageText ? `<p id="${usageId}" class="mt-0.5 text-sm text-fg-muted">${usageText}</p>` : ''}
            </div>
            <div class="flex shrink-0 flex-wrap gap-2">
              <button type="button" data-duplicate="${escapeHtml(tpl.id)}" class="btn-secondary">${t.t('templates.duplicate')}</button>
              ${
                tpl.builtIn
                  ? ''
                  : `<button type="button" data-edit="${escapeHtml(tpl.id)}" class="btn-secondary">${t.t('templates.edit')}</button>
                     <button type="button" data-delete="${escapeHtml(tpl.id)}" class="btn-ghost text-danger disabled:text-fg-muted"${
                       inUse ? ` disabled aria-describedby="${usageId}"` : ''
                     }>${ICON_TRASH}<span>${t.t('templates.delete')}</span></button>`
              }
            </div>
          </article>`;
      })
      .join('');
    list.querySelectorAll<HTMLButtonElement>('[data-duplicate]').forEach((btn) => {
      btn.addEventListener('click', () => this.duplicateFrom(btn.dataset['duplicate'] ?? ''));
    });
    list.querySelectorAll<HTMLButtonElement>('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => this.editExisting(btn.dataset['edit'] ?? ''));
    });
    list.querySelectorAll<HTMLButtonElement>('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', () => void this.handleDelete(btn.dataset['delete'] ?? ''));
    });
  }

  private duplicateFrom(id: string): void {
    const source = this.templates.find((t) => t.id === id);
    if (!source) return;
    const def = source.toDefinition();
    this.openEditor({
      ...def,
      id: generateId(def.name),
      name: this.deps.translator.t('templates.copy_name', {
        name: templateDisplayName(source, this.deps.translator),
      }),
      builtIn: false,
    });
  }

  private editExisting(id: string): void {
    const source = this.templates.find((t) => t.id === id);
    if (!source) return;
    this.openEditor(source.toDefinition());
  }

  private async handleDelete(id: string): Promise<void> {
    if (id in BUILT_IN_TEMPLATES) return;
    const t = this.deps.translator;
    if (!this.confirm(t.t('templates.confirm_delete'))) return;
    const result = await this.deps.deleteTemplate.execute({ id });
    if (result.ok) {
      this.qs<HTMLElement>('#list-status').textContent = '';
      await this.refresh();
    } else {
      this.qs<HTMLElement>('#list-status').textContent =
        `${t.t('templates.delete_failed')} ${result.error.message}`;
    }
  }

  private setView(editing: boolean, title: string): void {
    this.qs<HTMLElement>('#back-settings').classList.toggle('hidden', editing);
    this.qs<HTMLElement>('#back-list').classList.toggle('hidden', !editing);
    this.qs<HTMLElement>('#btn-new').classList.toggle('hidden', editing);
    this.qs<HTMLElement>('#list').classList.toggle('hidden', editing);
    this.qs<HTMLElement>('#list-status').classList.toggle('hidden', editing);
    this.qs<HTMLElement>('#editor').classList.toggle('hidden', !editing);
    const heading = this.qs<HTMLElement>('#page-title');
    heading.textContent = title;
    heading.focus({ preventScroll: true });
    window.scrollTo?.({ top: 0 });
  }

  private openEditor(initial: TemplateDefinition | null): void {
    const t = this.deps.translator;
    const def = initial ?? blankTemplate();
    this.editing = def;
    this.order = [
      ...def.featuredOrder.filter((k) => def.summaryKinds.includes(k)),
      ...def.summaryKinds.filter((k) => !def.featuredOrder.includes(k)),
    ];
    const editor = this.qs<HTMLElement>('#editor');
    editor.innerHTML = `
      <form id="tpl-form" class="card flex flex-col gap-6">
        <div class="flex min-w-0 flex-col gap-2">
          <label for="tpl-name" class="font-semibold">${t.t('templates.field_name')}</label>
          <input id="tpl-name" name="name" required value="${escapeHtml(def.name)}" class="field min-w-0 w-full" />
        </div>
        <div class="flex min-w-0 flex-col gap-2">
          <label for="tpl-role" class="font-semibold">${t.t('templates.field_meeting_type')}</label>
          <p id="tpl-role-hint" class="text-sm text-fg-muted">${t.t('templates.field_meeting_type_hint')}</p>
          <input id="tpl-role" name="systemRole" required value="${escapeHtml(def.systemRole)}" placeholder="${escapeHtml(t.t('templates.meeting_type_placeholder'))}" aria-describedby="tpl-role-hint" class="field min-w-0 w-full" />
        </div>
        <fieldset class="min-w-0">
          <legend class="font-semibold">${t.t('templates.field_kinds')}</legend>
          <p class="mt-2 text-sm text-fg-muted">${t.t('templates.field_kinds_hint')}</p>
          <div id="tpl-chips" class="mt-3 flex flex-wrap gap-2"></div>
          <p id="tpl-main" class="mt-3 flex items-center gap-2 text-sm empty:hidden"></p>
        </fieldset>
        <div class="flex min-w-0 flex-col gap-2">
          <label for="tpl-mindmap" class="font-semibold">${t.t('templates.field_mindmap')}</label>
          <textarea id="tpl-mindmap" name="mindMapStructure" required rows="3" class="field min-w-0 w-full py-2">${escapeHtml(def.mindMapStructure)}</textarea>
        </div>
        <details class="group min-w-0 rounded-[var(--radius-control)] border border-line">
          <summary class="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-2 font-semibold [&::-webkit-details-marker]:hidden">
            <span class="shrink-0 transition-transform duration-150 group-open:rotate-90">${ICON_CHEVRON}</span>
            <span class="min-w-0">${t.t('templates.customise')}</span>
          </summary>
          <div class="flex flex-col gap-3 border-t border-line px-4 pt-4 pb-5">
            <p class="text-sm text-fg-muted">${t.t('templates.customise_hint')}</p>
            ${SUMMARY_KINDS.map((k) => this.wordingRow(k, def)).join('')}
          </div>
        </details>
        <p id="form-error" role="alert" class="text-sm font-semibold text-danger empty:hidden"></p>
        <div class="flex flex-wrap justify-end gap-2">
          <button type="button" id="btn-cancel" class="btn-ghost">${t.t('templates.cancel')}</button>
          <button type="submit" class="btn-action">${t.t('templates.save')}</button>
        </div>
      </form>
    `;
    this.syncResults();
    const form = this.qs<HTMLFormElement>('#tpl-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      void this.handleSubmit();
    });
    form.addEventListener('click', (e) => {
      const target = e.target instanceof Element ? e.target : null;
      const chip = target?.closest<HTMLButtonElement>('[data-kind]');
      if (chip) this.toggleKind(chip.dataset['kind'] as SummaryKind);
      const makeMain = target?.closest<HTMLButtonElement>('[data-make-main]');
      if (makeMain) this.makeMain(makeMain.dataset['makeMain'] as SummaryKind);
    });
    this.qs<HTMLButtonElement>('#btn-cancel').addEventListener('click', () => this.closeEditor());
    const exists = this.templates.some((tpl) => tpl.id === def.id);
    this.setView(true, exists ? t.t('templates.edit_title') : t.t('templates.new'));
  }

  private wordingRow(k: SummaryKind, def: TemplateDefinition): string {
    const t = this.deps.translator;
    const defaultLabel = t.t(SUMMARY_LABEL_KEYS[k]);
    return `
      <div data-row="${k}" class="flex min-w-0 flex-col gap-3 rounded-[var(--radius-control)] border border-line p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="font-semibold">${defaultLabel}</p>
          <span data-row-main="${k}"></span>
        </div>
        <label class="flex min-w-0 flex-col gap-1.5">
          <span class="text-sm font-medium">${t.t('templates.field_label')}</span>
          <input name="label_${k}" placeholder="${escapeHtml(defaultLabel)}" value="${escapeHtml(def.kindLabels[k] ?? '')}" class="field min-w-0 w-full" />
        </label>
        <label class="flex min-w-0 flex-col gap-1.5">
          <span class="text-sm font-medium">${t.t('templates.field_prompt')}</span>
          <textarea name="prompt_${k}" rows="4" placeholder="${escapeHtml(defaultInstructionFor(k))}" class="field min-w-0 w-full py-2 text-sm">${escapeHtml(def.promptOverrides[k] ?? '')}</textarea>
        </label>
      </div>`;
  }

  private toggleKind(kind: SummaryKind): void {
    this.order = this.order.includes(kind)
      ? this.order.filter((k) => k !== kind)
      : [...this.order, kind];
    this.syncResults();
    this.root?.querySelector<HTMLButtonElement>(`[data-kind="${kind}"]`)?.focus();
  }

  private makeMain(kind: SummaryKind): void {
    this.order = [kind, ...this.order.filter((k) => k !== kind)];
    this.syncResults();
    this.root?.querySelector<HTMLElement>(`[data-row-main="${kind}"] span`)?.focus();
  }

  private syncResults(): void {
    const t = this.deps.translator;
    const main = this.order[0];
    this.qs<HTMLElement>('#tpl-chips').innerHTML = SUMMARY_KINDS.map((k) => {
      const on = this.order.includes(k);
      const isMain = k === main;
      return `<button type="button" class="chip gap-1.5" data-kind="${k}" aria-pressed="${on}">${
        isMain ? ICON_STAR_FILLED : ''
      }<span>${t.t(SUMMARY_LABEL_KEYS[k])}</span>${
        isMain ? `<span class="sr-only">(${t.t('templates.main_result')})</span>` : ''
      }</button>`;
    }).join('');
    this.qs<HTMLElement>('#tpl-main').innerHTML = main
      ? `${ICON_STAR_FILLED}<span>${t.t('templates.main_result')}: <strong class="font-semibold">${t.t(SUMMARY_LABEL_KEYS[main])}</strong></span>`
      : '';
    for (const k of SUMMARY_KINDS) {
      this.qs<HTMLElement>(`[data-row="${k}"]`).classList.toggle('hidden', !this.order.includes(k));
      this.qs<HTMLElement>(`[data-row-main="${k}"]`).innerHTML =
        k === main
          ? `<span tabindex="-1" class="${BADGE} inline-flex items-center gap-1">${t.t('templates.main_result')}</span>`
          : `<button type="button" class="btn-ghost min-h-11 px-3 text-sm" data-make-main="${k}">${t.t('templates.make_main')}</button>`;
    }
  }

  private closeEditor(): void {
    this.editing = null;
    this.order = [];
    this.qs<HTMLElement>('#editor').innerHTML = '';
    this.setView(false, this.deps.translator.t('templates.title'));
  }

  private async handleSubmit(): Promise<void> {
    if (!this.editing) return;
    const form = this.qs<HTMLFormElement>('#tpl-form');
    const data = new FormData(form);
    const name = field(data, 'name');
    const systemRole = field(data, 'systemRole');
    const mindMapStructure = field(data, 'mindMapStructure');
    if (!name || !systemRole || !mindMapStructure) return;

    if (this.order.length === 0) {
      this.showFormError(this.deps.translator.t('templates.kinds_required'));
      return;
    }

    const kindLabels: Partial<Record<SummaryKind, string>> = {};
    const promptOverrides: Partial<Record<SummaryKind, string>> = {};
    for (const k of SUMMARY_KINDS) {
      const label = field(data, `label_${k}`);
      if (label.length > 0) kindLabels[k] = label;
      const prompt = field(data, `prompt_${k}`);
      if (prompt.length > 0) promptOverrides[k] = prompt;
    }

    const id = this.editing.id || generateId(name);
    const definition: TemplateDefinition = {
      id,
      name,
      builtIn: false,
      systemRole,
      mindMapStructure,
      summaryKinds: SUMMARY_KINDS.filter((k) => this.order.includes(k)),
      featuredOrder: [...this.order],
      kindLabels,
      promptOverrides,
    };
    const result = await this.deps.saveTemplate.execute({ definition });
    if (!result.ok) {
      this.showFormError(result.error.message);
      return;
    }
    this.closeEditor();
    await this.refresh();
  }

  private showFormError(message: string): void {
    this.qs<HTMLElement>('#form-error').textContent = message;
  }

  private qs<T extends HTMLElement>(selector: string): T {
    if (!this.root) throw new Error('TemplatesPage not rendered yet');
    const el = this.root.querySelector<T>(selector);
    if (!el) throw new Error(`Missing element ${selector}`);
    return el;
  }
}

const blankTemplate = (): TemplateDefinition => ({
  id: '',
  name: '',
  builtIn: false,
  systemRole: '',
  mindMapStructure: '',
  summaryKinds: SUMMARY_KINDS,
  featuredOrder: SUMMARY_KINDS,
  kindLabels: {},
  promptOverrides: {},
});

const generateId = (seed: string): string => {
  const slug = seed
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const suffix = Math.random().toString(36).slice(2, 6);
  return slug ? `${slug}-${suffix}` : `tpl-${suffix}`;
};

const field = (data: FormData, key: string): string => {
  const value = data.get(key);
  return typeof value === 'string' ? value.trim() : '';
};
