import type { DeleteTemplateUseCase } from '../../application/use-cases/DeleteTemplateUseCase';
import type { ListTemplatesUseCase } from '../../application/use-cases/ListTemplatesUseCase';
import type { SaveTemplateUseCase } from '../../application/use-cases/SaveTemplateUseCase';
import {
  BUILT_IN_TEMPLATES,
  type Template,
  type TemplateDefinition,
} from '../../domain/meeting/value-objects/Template';
import {
  defaultInstructionFor,
  defaultLabelFor,
} from '../../domain/summary/services/SummaryDefaults';
import {
  SUMMARY_KINDS,
  type SummaryKind,
} from '../../domain/summary/value-objects/SummaryKind';
import type { Translator } from '../i18n/Translator';
import type { Page } from '../router/Router';

export interface TemplatesPageDeps {
  readonly listTemplates: ListTemplatesUseCase;
  readonly saveTemplate: SaveTemplateUseCase;
  readonly deleteTemplate: DeleteTemplateUseCase;
  readonly translator: Translator;
}

export class TemplatesPage implements Page {
  private root: HTMLElement | null = null;
  private templates: Template[] = [];
  private editing: TemplateDefinition | null = null;

  constructor(private readonly deps: TemplatesPageDeps) {}

  async render(root: HTMLElement): Promise<void> {
    this.root = root;
    const t = this.deps.translator;
    root.innerHTML = `
      <main class="mx-auto max-w-3xl px-6 py-12">
        <header class="mb-6 flex items-center justify-between gap-4">
          <h1 class="text-3xl font-bold tracking-tight">${t.t('templates.title')}</h1>
          <div class="flex gap-2">
            <button id="btn-new" class="btn-primary text-sm">${t.t('templates.new')}</button>
            <a href="#/settings" class="btn-ghost">${t.t('nav.back')}</a>
          </div>
        </header>
        <div id="list" class="space-y-3"></div>
        <div id="editor" class="hidden mt-6"></div>
      </main>
    `;
    this.qs<HTMLButtonElement>('#btn-new').addEventListener('click', () => this.openEditor(null));
    await this.refresh();
  }

  private async refresh(): Promise<void> {
    const result = await this.deps.listTemplates.execute();
    if (!result.ok) {
      this.qs<HTMLElement>('#list').innerHTML = `<p class="text-red-600">Error: ${result.error.message}</p>`;
      return;
    }
    this.templates = result.value;
    this.renderList();
  }

  private renderList(): void {
    const list = this.qs<HTMLElement>('#list');
    const t = this.deps.translator;
    list.innerHTML = this.templates
      .map(
        (tpl) => `
        <article class="card flex items-center justify-between gap-3">
          <div>
            <h3 class="font-semibold">${escape(tpl.name)}${
              tpl.builtIn
                ? ` <span class="ml-2 text-xs uppercase tracking-wide text-ink-400">${t.t('templates.builtin')}</span>`
                : ''
            }</h3>
            <p class="text-sm text-ink-400">${escape(tpl.systemRole)} · ${tpl.summaryKinds.length} sections</p>
          </div>
          <div class="flex gap-2 shrink-0 text-sm">
            <button type="button" data-duplicate="${tpl.id}" class="btn-ghost">${t.t('templates.duplicate')}</button>
            ${
              tpl.builtIn
                ? ''
                : `<button type="button" data-edit="${tpl.id}" class="btn-ghost">${t.t('templates.edit')}</button>
                   <button type="button" data-delete="${tpl.id}" class="btn-ghost text-red-600">${t.t('templates.delete')}</button>`
            }
          </div>
        </article>`,
      )
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
      name: `${def.name} copy`,
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
    if (!window.confirm(this.deps.translator.t('templates.confirm_delete'))) return;
    const result = await this.deps.deleteTemplate.execute({ id });
    if (result.ok) await this.refresh();
  }

  private openEditor(initial: TemplateDefinition | null): void {
    const t = this.deps.translator;
    this.editing = initial ?? blankTemplate();
    const editor = this.qs<HTMLElement>('#editor');
    editor.classList.remove('hidden');
    const def = this.editing;
    editor.innerHTML = `
      <form id="tpl-form" class="card space-y-4">
        <label class="block">
          <span class="text-sm font-medium">${t.t('templates.field_name')}</span>
          <input name="name" required value="${escape(def.name)}" class="mt-1 block w-full rounded-lg border border-ink-100 px-3 py-2 text-sm" />
        </label>
        <label class="block">
          <span class="text-sm font-medium">${t.t('templates.field_system_role')}</span>
          <input name="systemRole" required value="${escape(def.systemRole)}" placeholder="a doctor's appointment, a brainstorm…" class="mt-1 block w-full rounded-lg border border-ink-100 px-3 py-2 text-sm" />
        </label>
        <label class="block">
          <span class="text-sm font-medium">${t.t('templates.field_mindmap')}</span>
          <input name="mindMapStructure" required value="${escape(def.mindMapStructure)}" class="mt-1 block w-full rounded-lg border border-ink-100 px-3 py-2 text-sm" />
        </label>
        <fieldset>
          <legend class="text-sm font-medium mb-1">${t.t('templates.field_kinds')}</legend>
          <div class="space-y-1">
            ${SUMMARY_KINDS.map(
              (k) => `
              <label class="flex items-center gap-2 text-sm">
                <input type="checkbox" name="kind_${k}" ${def.summaryKinds.includes(k) ? 'checked' : ''} />
                <span class="w-32">${defaultLabelFor(k)}</span>
                <input name="label_${k}" placeholder="Custom label" value="${escape(def.kindLabels[k] ?? '')}" class="flex-1 rounded border border-ink-100 px-2 py-1 text-xs" />
              </label>`,
            ).join('')}
          </div>
        </fieldset>
        <fieldset>
          <legend class="text-sm font-medium mb-1">${t.t('templates.field_prompt_overrides')}</legend>
          <div class="space-y-2">
            ${SUMMARY_KINDS.map(
              (k) => `
              <details>
                <summary class="cursor-pointer text-xs text-ink-400">${defaultLabelFor(k)}</summary>
                <textarea name="prompt_${k}" rows="3" placeholder="${escapeAttr(defaultInstructionFor(k))}" class="mt-1 block w-full rounded border border-ink-100 px-2 py-1 text-xs font-mono">${escape(def.promptOverrides[k] ?? '')}</textarea>
              </details>`,
            ).join('')}
          </div>
        </fieldset>
        <div class="flex justify-end gap-2">
          <button type="button" id="btn-cancel" class="btn-ghost">${t.t('templates.cancel')}</button>
          <button type="submit" class="btn-primary">${t.t('templates.save')}</button>
        </div>
        <p id="form-error" class="text-sm text-red-600 hidden"></p>
      </form>
    `;
    this.qs<HTMLFormElement>('#tpl-form').addEventListener('submit', (e) => {
      e.preventDefault();
      void this.handleSubmit();
    });
    this.qs<HTMLButtonElement>('#btn-cancel').addEventListener('click', () => this.closeEditor());
  }

  private closeEditor(): void {
    this.editing = null;
    const editor = this.qs<HTMLElement>('#editor');
    editor.classList.add('hidden');
    editor.innerHTML = '';
  }

  private async handleSubmit(): Promise<void> {
    if (!this.editing) return;
    const form = this.qs<HTMLFormElement>('#tpl-form');
    const data = new FormData(form);
    const name = String(data.get('name') ?? '').trim();
    const systemRole = String(data.get('systemRole') ?? '').trim();
    const mindMapStructure = String(data.get('mindMapStructure') ?? '').trim();
    if (!name || !systemRole || !mindMapStructure) return;

    const kinds: SummaryKind[] = SUMMARY_KINDS.filter(
      (k) => data.get(`kind_${k}`) === 'on',
    );
    if (kinds.length === 0) {
      this.showFormError('Select at least one summary section');
      return;
    }

    const kindLabels: Partial<Record<SummaryKind, string>> = {};
    const promptOverrides: Partial<Record<SummaryKind, string>> = {};
    for (const k of SUMMARY_KINDS) {
      const label = String(data.get(`label_${k}`) ?? '').trim();
      if (label.length > 0) kindLabels[k] = label;
      const prompt = String(data.get(`prompt_${k}`) ?? '').trim();
      if (prompt.length > 0) promptOverrides[k] = prompt;
    }

    const id = this.editing.id || generateId(name);
    const definition: TemplateDefinition = {
      id,
      name,
      builtIn: false,
      systemRole,
      mindMapStructure,
      summaryKinds: kinds,
      featuredOrder: kinds,
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
    const el = this.qs<HTMLElement>('#form-error');
    el.textContent = message;
    el.classList.remove('hidden');
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

const escape = (raw: string): string =>
  raw.replace(/[&<>"]/g, (ch) =>
    ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : '&quot;',
  );

const escapeAttr = (raw: string): string => raw.replace(/"/g, '&quot;');
