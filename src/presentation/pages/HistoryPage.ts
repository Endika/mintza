import type { ListMeetingsUseCase } from '../../application/use-cases/ListMeetingsUseCase';
import type { Translator } from '../i18n/Translator';
import type { Page } from '../router/Router';

export interface HistoryPageDeps {
  readonly listMeetings: ListMeetingsUseCase;
  readonly translator: Translator;
}

export class HistoryPage implements Page {
  constructor(private readonly deps: HistoryPageDeps) {}

  async render(root: HTMLElement): Promise<void> {
    const t = this.deps.translator;
    root.innerHTML = `
      <main class="mx-auto max-w-3xl px-6 py-12">
        <header class="mb-8 flex items-center justify-between">
          <h1 class="text-3xl font-bold tracking-tight">${t.t('history.title')}</h1>
          <a href="#/" class="btn-ghost">${t.t('nav.back')}</a>
        </header>
        <div id="list" class="space-y-3">
          <em class="text-ink-400">${t.t('history.loading')}</em>
        </div>
      </main>
    `;
    const list = root.querySelector<HTMLElement>('#list');
    if (!list) return;
    const result = await this.deps.listMeetings.execute();
    if (!result.ok) {
      list.innerHTML = `<p class="text-red-600">Error: ${result.error.message}</p>`;
      return;
    }
    if (result.value.length === 0) {
      list.innerHTML = `<em class="text-ink-400">${t.t('history.empty')}</em>`;
      return;
    }
    list.innerHTML = result.value
      .map(
        (m) => `
        <article class="card flex items-center justify-between">
          <div>
            <h3 class="font-semibold">${escapeHtml(m.title)}</h3>
            <p class="text-sm text-ink-400">
              ${m.startedAt.toLocaleString()} · ${Math.round(m.durationMs / 1000)}s · ${m.templateKind}
            </p>
          </div>
          ${m.starred ? '<span title="Starred">★</span>' : ''}
        </article>`,
      )
      .join('');
  }
}

const escapeHtml = (raw: string): string =>
  raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
