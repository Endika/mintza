import type { DeleteMeetingUseCase } from '../../application/use-cases/DeleteMeetingUseCase';
import type { GetMeetingUseCase } from '../../application/use-cases/GetMeetingUseCase';
import type { ListTemplatesUseCase } from '../../application/use-cases/ListTemplatesUseCase';
import type { RegenerateSummariesUseCase } from '../../application/use-cases/RegenerateSummariesUseCase';
import type { Meeting } from '../../domain/meeting/entities/Meeting';
import { MeetingId } from '../../domain/meeting/value-objects/MeetingId';
import type { Template } from '../../domain/meeting/value-objects/Template';
import { defaultLabelFor } from '../../domain/summary/services/SummaryDefaults';
import type { SummaryKind } from '../../domain/summary/value-objects/SummaryKind';
import { CostCounter } from '../components/CostCounter';
import { ExportMenu } from '../components/ExportMenu';
import { MindMapView } from '../components/MindMapView';
import { StatisticsPanel } from '../components/StatisticsPanel';
import { TemperatureGauge } from '../components/TemperatureGauge';
import type { Translator } from '../i18n/Translator';
import type { TranslationKey } from '../i18n/translations';
import { Router, type Page } from '../router/Router';
import { renderMarkdown } from '../util/renderMarkdown';

export interface MeetingDetailPageDeps {
  readonly getMeeting: GetMeetingUseCase;
  readonly deleteMeeting: DeleteMeetingUseCase;
  readonly listTemplates: ListTemplatesUseCase;
  readonly regenerateSummaries: RegenerateSummariesUseCase;
  readonly translator: Translator;
}

export class MeetingDetailPage implements Page {
  private readonly gauge = new TemperatureGauge();
  private readonly statsPanel = new StatisticsPanel();
  private readonly exportMenu = new ExportMenu();
  private readonly mindMapView = new MindMapView();
  private readonly costCounter = new CostCounter();
  private meeting: Meeting | null = null;
  private templates: Template[] = [];
  private root: HTMLElement | null = null;

  constructor(private readonly deps: MeetingDetailPageDeps) {}

  async render(root: HTMLElement): Promise<void> {
    this.root = root;
    const t = this.deps.translator;
    const id = parseIdFromHash();
    if (!id) {
      root.innerHTML = errorShell(t.t('nav.back'), 'Missing meeting id');
      return;
    }

    let meetingId: MeetingId;
    try {
      meetingId = MeetingId.restore(id);
    } catch {
      root.innerHTML = errorShell(t.t('nav.back'), 'Invalid meeting id');
      return;
    }

    root.innerHTML = `
      <main class="mx-auto max-w-3xl px-6 py-12">
        <header class="mb-6 flex items-center justify-between gap-4">
          <a href="#/history" class="btn-ghost">${t.t('nav.back')}</a>
          <button id="btn-delete" class="btn-ghost text-red-600 text-sm">Delete</button>
        </header>
        <div id="detail-body"><em class="text-ink-400">${t.t('history.loading')}</em></div>
      </main>
    `;

    const [meetingResult, templatesResult] = await Promise.all([
      this.deps.getMeeting.execute({ id: meetingId }),
      this.deps.listTemplates.execute(),
    ]);
    this.templates = templatesResult.ok ? templatesResult.value : [];
    const body = root.querySelector<HTMLElement>('#detail-body');
    if (!body) return;
    if (!meetingResult.ok) {
      body.innerHTML = `<p class="text-red-600">Error: ${meetingResult.error.message}</p>`;
      return;
    }
    if (!meetingResult.value) {
      body.innerHTML = `<em class="text-ink-400">Meeting not found.</em>`;
      return;
    }
    this.meeting = meetingResult.value;
    this.renderMeeting(body, this.meeting);

    root
      .querySelector<HTMLButtonElement>('#btn-delete')
      ?.addEventListener('click', () => void this.handleDelete(meetingId));
  }

  private async handleDelete(id: MeetingId): Promise<void> {
    if (!window.confirm('Delete this meeting? This cannot be undone.')) return;
    const result = await this.deps.deleteMeeting.execute({ id });
    if (result.ok) Router.navigate('/history');
  }

  private renderMeeting(target: HTMLElement, meeting: Meeting): void {
    const t = this.deps.translator;
    target.innerHTML = `
      <section class="card mb-6">
        <h1 class="text-2xl font-bold tracking-tight">${escape(meeting.title)}</h1>
        <p class="mt-1 text-sm text-ink-400">
          ${meeting.startedAt.toLocaleString()} · ${escape(meeting.template.name)} · ${meeting.language.code}
        </p>
        <div id="detail-cost" class="mt-3"></div>
      </section>

      ${
        meeting.temperature
          ? `
        <section class="card mb-6">
          <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-400">${t.t('home.sentiment')}</h3>
          <div id="detail-temperature"></div>
        </section>`
          : ''
      }

      <section class="card mb-6">
        <div class="mb-3 flex items-center justify-between gap-3 flex-wrap">
          <h3 class="text-sm font-semibold uppercase tracking-wide text-ink-400">${t.t('home.summary')}</h3>
          ${this.regenerateControlsHtml()}
        </div>
        <p id="regen-status" class="text-xs text-ink-400 mb-2 hidden"></p>
        <div id="detail-summaries"></div>
      </section>

      ${
        meeting.mindMap
          ? `
        <section class="card mb-6">
          <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-400">${t.t('home.mind_map')}</h3>
          <div id="detail-mindmap"></div>
        </section>`
          : ''
      }

      <section class="card mb-6">
        <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-400">${t.t('home.transcript')}</h3>
        <div class="whitespace-pre-wrap text-ink-600 text-sm">
          ${escape(meeting.fullText().value) || '<em class="text-ink-400">No transcript.</em>'}
        </div>
      </section>

      <section class="card mb-6">
        <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-400">${t.t('home.statistics')}</h3>
        <div id="detail-stats"></div>
      </section>

      <section class="card">
        <div id="detail-export"></div>
      </section>
    `;

    this.costCounter.renderFinal(target.querySelector<HTMLElement>('#detail-cost')!, meeting);
    if (meeting.temperature) {
      this.gauge.render(
        target.querySelector<HTMLElement>('#detail-temperature')!,
        meeting.temperature,
      );
    }
    this.renderSummaries(target.querySelector<HTMLElement>('#detail-summaries')!, meeting);
    if (meeting.mindMap) {
      this.mindMapView.render(
        target.querySelector<HTMLElement>('#detail-mindmap')!,
        meeting.mindMap,
      );
    }
    this.statsPanel.render(target.querySelector<HTMLElement>('#detail-stats')!, meeting);
    this.exportMenu.render(
      target.querySelector<HTMLElement>('#detail-export')!,
      () => this.meeting,
      t,
    );

    target.querySelector<HTMLButtonElement>('#btn-regen')?.addEventListener('click', () => {
      void this.handleRegenerate();
    });
  }

  private regenerateControlsHtml(): string {
    if (this.templates.length === 0 || !this.meeting) return '';
    const t = this.deps.translator;
    return `
      <div class="flex items-center gap-2 text-sm">
        <span class="text-ink-400">${t.t('meeting.regenerate')}</span>
        <select id="regen-template" class="rounded-lg border border-ink-100 px-2 py-1 text-xs">
          ${this.templates
            .map(
              (tpl) =>
                `<option value="${tpl.id}" ${tpl.id === this.meeting?.template.id ? 'selected' : ''}>${escape(tpl.name)}</option>`,
            )
            .join('')}
        </select>
        <button type="button" id="btn-regen" class="btn-ghost text-xs">${t.t('templates.edit')}</button>
      </div>
    `;
  }

  private async handleRegenerate(): Promise<void> {
    if (!this.meeting || !this.root) return;
    const select = this.root.querySelector<HTMLSelectElement>('#regen-template');
    if (!select) return;
    const newTemplate = this.templates.find((tpl) => tpl.id === select.value);
    if (!newTemplate) return;
    const btn = this.root.querySelector<HTMLButtonElement>('#btn-regen');
    const status = this.root.querySelector<HTMLElement>('#regen-status');
    if (btn) btn.disabled = true;
    if (status) {
      status.classList.remove('hidden');
      status.textContent = this.deps.translator.t('meeting.regenerating');
    }
    const transient = this.meeting.withTemplate(newTemplate);
    const output = await this.deps.regenerateSummaries.execute({
      meeting: transient,
      template: newTemplate,
    });
    this.meeting = transient;
    this.renderMeeting(this.root.querySelector<HTMLElement>('#detail-body')!, transient);
    if (status) {
      status.textContent = `${output.successCount} ok / ${output.failureCount} failed.`;
    }
  }

  private renderSummaries(target: HTMLElement, meeting: Meeting): void {
    if (meeting.summaries.size === 0) {
      target.innerHTML = '<em class="text-ink-400">No summaries.</em>';
      return;
    }
    const order = meeting.template.featuredSummaryOrder();
    target.innerHTML = order
      .map((kind) => {
        const summary = meeting.summaries.get(kind);
        if (!summary) return '';
        const label = meeting.template.labelFor(
          kind,
          this.deps.translator.t(SUMMARY_KEYS[kind]) || defaultLabelFor(kind),
        );
        return `<article class="mb-4">
            <h4 class="text-sm font-semibold uppercase tracking-wide text-ink-400">${escape(label)}</h4>
            <div class="prose-summary mt-1">${renderMarkdown(summary.content)}</div>
          </article>`;
      })
      .join('');
  }
}

const SUMMARY_KEYS: Record<SummaryKind, TranslationKey> = {
  bullet_points: 'summary.bullet_points',
  action_items: 'summary.action_items',
  one_liner: 'summary.one_liner',
  keywords: 'summary.keywords',
  sentiment: 'summary.sentiment',
  timeline: 'summary.timeline',
  decisions: 'summary.decisions',
  next_steps: 'summary.next_steps',
};

const parseIdFromHash = (): string | null => {
  const raw = window.location.hash.replace(/^#/, '');
  const queryStart = raw.indexOf('?');
  if (queryStart < 0) return null;
  const params = new URLSearchParams(raw.slice(queryStart + 1));
  return params.get('id');
};

const errorShell = (backLabel: string, message: string): string => `
  <main class="mx-auto max-w-3xl px-6 py-12">
    <header class="mb-8"><a href="#/history" class="btn-ghost">${backLabel}</a></header>
    <p class="text-red-600">${escape(message)}</p>
  </main>
`;

const escape = (raw: string): string =>
  raw.replace(/[&<>"]/g, (ch) =>
    ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : '&quot;',
  );
