import type { DeleteMeetingUseCase } from '../../application/use-cases/DeleteMeetingUseCase';
import type { GetMeetingUseCase } from '../../application/use-cases/GetMeetingUseCase';
import type { ListTemplatesUseCase } from '../../application/use-cases/ListTemplatesUseCase';
import type { RegenerateSummariesUseCase } from '../../application/use-cases/RegenerateSummariesUseCase';
import type { Meeting } from '../../domain/meeting/entities/Meeting';
import { MeetingId } from '../../domain/meeting/value-objects/MeetingId';
import type { Template } from '../../domain/meeting/value-objects/Template';
import { CostCounter } from '../components/CostCounter';
import { ExportMenu } from '../components/ExportMenu';
import { MindMapView } from '../components/MindMapView';
import { StatisticsPanel } from '../components/StatisticsPanel';
import { TemperatureGauge } from '../components/TemperatureGauge';
import type { Translator } from '../i18n/Translator';
import { SUMMARY_LABEL_KEYS } from '../i18n/summaryLabelKey';
import { templateDisplayName } from '../i18n/templateDisplayName';
import { Router, type Page } from '../router/Router';
import { renderMarkdown } from '../util/renderMarkdown';
import { escapeHtml } from '../util/escapeHtml';

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
      root.innerHTML = errorShell(t.t('nav.back'), t.t('detail.missing_id'));
      return;
    }

    let meetingId: MeetingId;
    try {
      meetingId = MeetingId.restore(id);
    } catch {
      root.innerHTML = errorShell(t.t('nav.back'), t.t('detail.invalid_id'));
      return;
    }

    root.innerHTML = `
      <main class="mx-auto max-w-3xl px-6 py-12">
        <header class="mb-6 flex items-center justify-between gap-4">
          <a href="#/history" class="btn-ghost">${t.t('nav.back')}</a>
          <button id="btn-delete" class="btn-ghost text-danger text-sm">${t.t('detail.delete')}</button>
        </header>
        <p id="delete-status" class="mb-4 text-sm text-danger hidden" role="status"></p>
        <div id="detail-body"><em class="text-fg-muted">${t.t('history.loading')}</em></div>
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
      body.innerHTML = `<p class="text-danger">${t.t('detail.load_failed')} ${escapeHtml(meetingResult.error.message)}</p>`;
      return;
    }
    if (!meetingResult.value) {
      body.innerHTML = `<em class="text-fg-muted">${t.t('detail.not_found')}</em>`;
      return;
    }
    this.meeting = meetingResult.value;
    this.renderMeeting(body, this.meeting);

    root
      .querySelector<HTMLButtonElement>('#btn-delete')
      ?.addEventListener('click', () => void this.handleDelete(meetingId));
  }

  private async handleDelete(id: MeetingId): Promise<void> {
    if (!window.confirm(this.deps.translator.t('detail.confirm_delete'))) return;
    const result = await this.deps.deleteMeeting.execute({ id });
    if (result.ok) {
      Router.navigate('/history');
      return;
    }
    const status = this.root?.querySelector<HTMLElement>('#delete-status');
    if (status) {
      status.textContent = `${this.deps.translator.t('meeting.delete_failed')} ${result.error.message}`;
      status.classList.remove('hidden');
    }
  }

  private renderMeeting(target: HTMLElement, meeting: Meeting): void {
    const t = this.deps.translator;
    target.innerHTML = `
      <section class="card mb-6">
        <h1 class="text-2xl font-bold tracking-tight">${escapeHtml(meeting.title)}</h1>
        <p class="mt-1 text-sm text-fg-muted">
          ${meeting.startedAt.toLocaleString()} · ${escapeHtml(templateDisplayName(meeting.template, t))} · ${meeting.language.code}
        </p>
        <div id="detail-cost" class="mt-3"></div>
      </section>

      ${
        meeting.temperature
          ? `
        <section class="card mb-6">
          <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-fg-muted">${t.t('home.sentiment')}</h3>
          <div id="detail-temperature"></div>
        </section>`
          : ''
      }

      <section class="card mb-6">
        <div class="mb-3 flex items-center justify-between gap-3 flex-wrap">
          <h3 class="text-sm font-semibold uppercase tracking-wide text-fg-muted">${t.t('home.summary')}</h3>
          ${this.regenerateControlsHtml()}
        </div>
        <p id="regen-status" class="text-xs text-fg-muted mb-2 hidden"></p>
        <div id="detail-summaries"></div>
      </section>

      ${
        meeting.mindMap
          ? `
        <section class="card mb-6">
          <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-fg-muted">${t.t('home.mind_map')}</h3>
          <div id="detail-mindmap"></div>
        </section>`
          : ''
      }

      <section class="card mb-6">
        <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-fg-muted">${t.t('home.transcript')}</h3>
        <div class="whitespace-pre-wrap text-fg text-sm">
          ${escapeHtml(meeting.fullText().value) || `<em class="text-fg-muted">${t.t('detail.no_transcript')}</em>`}
        </div>
      </section>

      <section class="card mb-6">
        <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-fg-muted">${t.t('home.statistics')}</h3>
        <div id="detail-stats"></div>
      </section>

      <section class="card">
        <div id="detail-export"></div>
      </section>
    `;

    this.costCounter.renderFinal(target.querySelector<HTMLElement>('#detail-cost')!, meeting, t);
    if (meeting.temperature) {
      this.gauge.render(
        target.querySelector<HTMLElement>('#detail-temperature')!,
        meeting.temperature,
        t,
      );
    }
    this.renderSummaries(target.querySelector<HTMLElement>('#detail-summaries')!, meeting);
    if (meeting.mindMap) {
      this.mindMapView.render(
        target.querySelector<HTMLElement>('#detail-mindmap')!,
        meeting.mindMap,
      );
    }
    this.statsPanel.render(target.querySelector<HTMLElement>('#detail-stats')!, meeting, t);
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
        <span class="text-fg-muted">${t.t('meeting.regenerate')}</span>
        <select id="regen-template" class="rounded-lg border border-edge px-2 py-1 text-xs">
          ${this.templates
            .map(
              (tpl) =>
                `<option value="${escapeHtml(tpl.id)}" ${tpl.id === this.meeting?.template.id ? 'selected' : ''}>${escapeHtml(templateDisplayName(tpl, t))}</option>`,
            )
            .join('')}
        </select>
        <button type="button" id="btn-regen" class="btn-ghost text-xs">${t.t('detail.regenerate')}</button>
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
      status.textContent = this.deps.translator.t('home.summaries_result', {
        ok: output.successCount,
        failed: output.failureCount,
      });
    }
  }

  private renderSummaries(target: HTMLElement, meeting: Meeting): void {
    if (meeting.summaries.size === 0) {
      target.innerHTML = `<em class="text-fg-muted">${this.deps.translator.t('detail.no_summaries')}</em>`;
      return;
    }
    const order = meeting.template.featuredSummaryOrder();
    target.innerHTML = order
      .map((kind) => {
        const summary = meeting.summaries.get(kind);
        if (!summary) return '';
        const label = meeting.template.labelFor(
          kind,
          this.deps.translator.t(SUMMARY_LABEL_KEYS[kind]),
        );
        return `<article class="mb-4">
            <h4 class="text-sm font-semibold uppercase tracking-wide text-fg-muted">${escapeHtml(label)}</h4>
            <div class="prose-summary mt-1">${renderMarkdown(summary.content)}</div>
          </article>`;
      })
      .join('');
  }
}

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
    <p class="text-danger">${escapeHtml(message)}</p>
  </main>
`;
