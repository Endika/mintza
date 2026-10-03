import type { DeleteMeetingUseCase } from '../../application/use-cases/DeleteMeetingUseCase';
import type { GetMeetingUseCase } from '../../application/use-cases/GetMeetingUseCase';
import type { ListTemplatesUseCase } from '../../application/use-cases/ListTemplatesUseCase';
import type { RegenerateSummariesUseCase } from '../../application/use-cases/RegenerateSummariesUseCase';
import type { Meeting } from '../../domain/meeting/entities/Meeting';
import { MeetingId } from '../../domain/meeting/value-objects/MeetingId';
import type { Template } from '../../domain/meeting/value-objects/Template';
import { SUMMARY_KINDS, type SummaryKind } from '../../domain/summary/value-objects/SummaryKind';
import { CostCounter } from '../components/CostCounter';
import { bindDisclosures, disclosureHtml } from '../components/Disclosure';
import { ExportMenu } from '../components/ExportMenu';
import { ICON_BACK, ICON_CHEVRON, ICON_TRASH } from '../components/icons';
import { MindMapView } from '../components/MindMapView';
import { StatisticsPanel } from '../components/StatisticsPanel';
import { TemperatureGauge } from '../components/TemperatureGauge';
import type { Translator } from '../i18n/Translator';
import { SUMMARY_LABEL_KEYS } from '../i18n/summaryLabelKey';
import { languageName } from '../i18n/languageName';
import { templateDisplayName } from '../i18n/templateDisplayName';
import { Router, type Page } from '../router/Router';
import { escapeHtml } from '../util/escapeHtml';
import { meetingTitle } from '../util/meetingTitle';
import { metaLine } from '../util/metaLine';
import { orderSummaries } from '../util/orderSummaries';
import { renderMarkdown } from '../util/renderMarkdown';

export interface MeetingDetailPageDeps {
  readonly getMeeting: GetMeetingUseCase;
  readonly deleteMeeting: DeleteMeetingUseCase;
  readonly listTemplates: ListTemplatesUseCase;
  readonly regenerateSummaries: RegenerateSummariesUseCase;
  readonly translator: Translator;
}

// The primary result's label is an h2, so its content starts at h3; the others sit one level lower.
const PRIMARY_HEADING_OFFSET = 2;
const REST_HEADING_OFFSET = 3;

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

  private get t(): Translator {
    return this.deps.translator;
  }

  dispose(): void {
    this.exportMenu.dispose();
  }

  async render(root: HTMLElement): Promise<void> {
    this.root = root;
    const t = this.t;
    const id = parseIdFromHash();
    if (!id) {
      root.innerHTML = this.problemShell(t.t('detail.missing_id'));
      return;
    }

    let meetingId: MeetingId;
    try {
      meetingId = MeetingId.restore(id);
    } catch {
      root.innerHTML = this.problemShell(t.t('detail.invalid_id'));
      return;
    }

    root.innerHTML = `
      <div class="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <p class="text-fg-muted">${t.t('history.loading')}</p>
      </div>
    `;

    const [meetingResult, templatesResult] = await Promise.all([
      this.deps.getMeeting.execute({ id: meetingId }),
      this.deps.listTemplates.execute(),
    ]);
    this.templates = templatesResult.ok ? templatesResult.value : [];
    if (!meetingResult.ok) {
      root.innerHTML = this.problemShell(t.t('detail.load_failed'), meetingResult.error.message);
      return;
    }
    if (!meetingResult.value) {
      root.innerHTML = this.problemShell(t.t('detail.not_found'));
      return;
    }
    this.meeting = meetingResult.value;
    root.innerHTML = `
      <div class="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <a href="#/history" class="btn-ghost -ml-3 mb-3 px-3">${ICON_BACK}<span>${t.t('nav.history')}</span></a>
        <div id="detail-body"></div>
        <p id="regen-status" role="status" aria-live="polite" class="mt-2 text-sm text-fg-muted empty:sr-only"></p>
        <div id="detail-rest"></div>
        <div class="mt-10 border-t border-line pt-6">
          <button type="button" id="btn-delete" class="btn-ghost -ml-3 text-danger">${ICON_TRASH}<span>${t.t('detail.delete_meeting')}</span></button>
          <p id="delete-status" class="mt-2 text-sm text-danger hidden" role="status"></p>
        </div>
      </div>
    `;
    bindDisclosures(root.querySelector<HTMLElement>('#detail-body')!);
    this.renderMeeting(this.meeting);
    root
      .querySelector<HTMLButtonElement>('#btn-delete')
      ?.addEventListener('click', () => void this.handleDelete(meetingId));
  }

  private problemShell(message: string, detail?: string): string {
    const t = this.t;
    return `
      <div class="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <section class="card flex flex-col items-start gap-4">
          <div>
            <h1 class="text-2xl font-semibold tracking-tight">${escapeHtml(message)}</h1>
            ${detail ? `<p class="mt-2 break-words text-sm text-fg-muted">${escapeHtml(detail)}</p>` : ''}
          </div>
          <a href="#/history" class="btn-secondary">${ICON_BACK}<span>${t.t('detail.back_to_history')}</span></a>
        </section>
      </div>
    `;
  }

  private async handleDelete(id: MeetingId): Promise<void> {
    if (!window.confirm(this.t.t('detail.confirm_delete'))) return;
    const result = await this.deps.deleteMeeting.execute({ id });
    if (result.ok) {
      Router.navigate('/history');
      return;
    }
    const status = this.root?.querySelector<HTMLElement>('#delete-status');
    if (status) {
      status.textContent = `${this.t.t('meeting.delete_failed')} ${result.error.message}`;
      status.classList.remove('hidden');
    }
  }

  private renderMeeting(meeting: Meeting): void {
    const target = this.root?.querySelector<HTMLElement>('#detail-body');
    const rest = this.root?.querySelector<HTMLElement>('#detail-rest');
    if (!this.root || !target || !rest) return;
    const t = this.t;
    const lang = t.language;
    const when = meeting.startedAt.toLocaleString(lang, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    const transcript = escapeHtml(meeting.fullText().value);

    target.innerHTML = `
      <header class="mb-6">
        <h1 class="break-words text-3xl font-semibold tracking-tight sm:text-4xl">${escapeHtml(meetingTitle(meeting, t))}</h1>
        <p class="mt-2 text-sm text-fg-muted">${metaLine([when, templateDisplayName(meeting.template, t), languageName(meeting.language.code)])}</p>
        <div id="detail-meta" class="mt-0.5"></div>
      </header>

      ${this.summariesHtml(meeting)}
      ${this.regenerateHtml()}
    `;
    rest.innerHTML = `
      <details class="card group mt-4 p-0 sm:p-0">
        <summary class="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-[var(--radius-card)] px-5 py-3 font-semibold sm:px-6 [&::-webkit-details-marker]:hidden">
          <span>${t.t('home.transcript')}</span>
          <span class="shrink-0 text-fg-muted transition-transform duration-150 group-open:rotate-90">${ICON_CHEVRON}</span>
        </summary>
        <div class="whitespace-pre-wrap break-words px-5 pb-5 leading-relaxed sm:px-6">${transcript || `<span class="text-fg-muted">${t.t('detail.no_transcript')}</span>`}</div>
      </details>

      <section class="mt-10" aria-labelledby="more-title">
        <h2 id="more-title" class="mb-4 text-xl font-semibold tracking-tight">${t.t('home.more_about')}</h2>
        <div class="flex flex-col gap-4">
          ${
            meeting.temperature
              ? `<section class="card">
                  <h3 class="mb-3 text-lg font-semibold">${t.t('home.sentiment')}</h3>
                  <div id="detail-temperature"></div>
                </section>`
              : ''
          }
          ${
            meeting.mindMap
              ? `<section class="card">
                  <h3 class="mb-3 text-lg font-semibold">${t.t('home.mind_map')}</h3>
                  <div id="detail-mindmap"></div>
                </section>`
              : ''
          }
          <section class="card">
            <h3 class="mb-3 text-lg font-semibold">${t.t('home.statistics')}</h3>
            <div id="detail-stats"></div>
          </section>
          <section class="card">
            <h3 class="mb-3 text-lg font-semibold">${t.t('detail.cost')}</h3>
            <div id="detail-cost"></div>
          </section>
          <div id="detail-export"></div>
        </div>
      </section>
    `;

    this.costCounter.renderSummaryLine(
      target.querySelector<HTMLElement>('#detail-meta')!,
      meeting,
      t,
    );
    if (meeting.temperature) {
      this.gauge.render(
        rest.querySelector<HTMLElement>('#detail-temperature')!,
        meeting.temperature,
        t,
      );
    }
    if (meeting.mindMap) {
      this.mindMapView.render(rest.querySelector<HTMLElement>('#detail-mindmap')!, meeting.mindMap);
    }
    this.statsPanel.render(rest.querySelector<HTMLElement>('#detail-stats')!, meeting, t);
    this.costCounter.renderBreakdown(rest.querySelector<HTMLElement>('#detail-cost')!, meeting, t);
    this.exportMenu.render(
      rest.querySelector<HTMLElement>('#detail-export')!,
      () => this.meeting,
      t,
    );

    target.querySelector<HTMLButtonElement>('#btn-regen')?.addEventListener('click', () => {
      void this.handleRegenerate();
    });
  }

  private summariesHtml(meeting: Meeting): string {
    const t = this.t;
    // The sentiment gauge below shows the tone better than its raw text, as on Home.
    const generated = SUMMARY_KINDS.filter(
      (kind) =>
        meeting.summaries.has(kind) && !(meeting.temperature !== undefined && kind === 'sentiment'),
    );
    const { primary, rest } = orderSummaries(meeting.template, generated);
    if (!primary) {
      return `
        <section class="card">
          <h2 class="text-lg font-semibold">${t.t('home.summary')}</h2>
          <p class="mt-2 text-fg-muted">${t.t('detail.no_summaries')}</p>
        </section>`;
    }
    const restHtml =
      rest.length === 0
        ? ''
        : `
        <section class="mt-4" aria-labelledby="rest-title">
          <h2 id="rest-title" class="sr-only">${t.t('detail.other_results')}</h2>
          <div class="card divide-y divide-line overflow-hidden p-0 sm:p-0">
            ${rest
              .map((kind) =>
                disclosureHtml({
                  id: `detail-result-${kind}`,
                  kind,
                  label: escapeHtml(this.summaryLabel(meeting.template, kind)),
                  bodyHtml: this.summaryHtml(meeting, kind, REST_HEADING_OFFSET),
                }),
              )
              .join('')}
          </div>
        </section>`;
    return `
      <section id="primary-summary" class="card" data-kind="${primary}" aria-labelledby="primary-title">
        <h2 id="primary-title" class="text-lg font-semibold">${escapeHtml(this.summaryLabel(meeting.template, primary))}</h2>
        <div class="prose-summary mt-2 leading-relaxed">${this.summaryHtml(meeting, primary, PRIMARY_HEADING_OFFSET)}</div>
      </section>
      ${restHtml}`;
  }

  private summaryHtml(meeting: Meeting, kind: SummaryKind, headingOffset: number): string {
    const summary = meeting.summaries.get(kind);
    return summary ? renderMarkdown(summary.content, { headingOffset }) : '';
  }

  private summaryLabel(template: Template, kind: SummaryKind): string {
    return template.labelFor(kind, this.t.t(SUMMARY_LABEL_KEYS[kind]));
  }

  private regenerateHtml(): string {
    if (this.templates.length === 0 || !this.meeting) return '';
    const t = this.t;
    const current = this.meeting.template.id;
    return `
      <div class="mt-4 flex flex-wrap items-end gap-3">
        <div class="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-none">
          <label for="regen-template" class="text-sm font-medium">${t.t('meeting.regenerate')}</label>
          <select id="regen-template" class="field sm:w-auto sm:min-w-56">
            ${this.templates
              .map(
                (tpl) =>
                  `<option value="${escapeHtml(tpl.id)}" ${tpl.id === current ? 'selected' : ''}>${escapeHtml(templateDisplayName(tpl, t))}</option>`,
              )
              .join('')}
          </select>
        </div>
        <button type="button" id="btn-regen" class="btn-secondary">${t.t('detail.regenerate')}</button>
      </div>
    `;
  }

  private async handleRegenerate(): Promise<void> {
    if (!this.meeting || !this.root) return;
    const select = this.root.querySelector<HTMLSelectElement>('#regen-template');
    const newTemplate = this.templates.find((tpl) => tpl.id === select?.value);
    if (!newTemplate) return;
    const btn = this.root.querySelector<HTMLButtonElement>('#btn-regen');
    if (btn) btn.disabled = true;
    this.setRegenStatus(this.t.t('meeting.regenerating'));
    const transient = this.meeting.withTemplate(newTemplate);
    const output = await this.deps.regenerateSummaries.execute({
      meeting: transient,
      template: newTemplate,
    });
    this.meeting = transient;
    this.renderMeeting(transient);
    this.root.querySelector<HTMLButtonElement>('#btn-regen')?.focus();
    this.setRegenStatus(
      this.t.t('home.summaries_result', { ok: output.successCount, failed: output.failureCount }),
    );
  }

  private setRegenStatus(message: string): void {
    const status = this.root?.querySelector<HTMLElement>('#regen-status');
    if (!status) return;
    status.textContent = message;
  }
}

const parseIdFromHash = (): string | null => {
  const raw = window.location.hash.replace(/^#/, '');
  const queryStart = raw.indexOf('?');
  if (queryStart < 0) return null;
  const params = new URLSearchParams(raw.slice(queryStart + 1));
  return params.get('id');
};
