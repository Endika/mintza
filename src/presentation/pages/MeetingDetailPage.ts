import type { DeleteMeetingUseCase } from '../../application/use-cases/DeleteMeetingUseCase';
import type { GetMeetingUseCase } from '../../application/use-cases/GetMeetingUseCase';
import type { Meeting } from '../../domain/meeting/entities/Meeting';
import { MeetingId } from '../../domain/meeting/value-objects/MeetingId';
import type { SummaryKind } from '../../domain/summary/value-objects/SummaryKind';
import { CostCounter } from '../components/CostCounter';
import { ExportMenu } from '../components/ExportMenu';
import { MindMapView } from '../components/MindMapView';
import { StatisticsPanel } from '../components/StatisticsPanel';
import { TemperatureGauge } from '../components/TemperatureGauge';
import type { Translator } from '../i18n/Translator';
import type { TranslationKey } from '../i18n/translations';
import { Router, type Page } from '../router/Router';

export interface MeetingDetailPageDeps {
  readonly getMeeting: GetMeetingUseCase;
  readonly deleteMeeting: DeleteMeetingUseCase;
  readonly translator: Translator;
}

export class MeetingDetailPage implements Page {
  private readonly gauge = new TemperatureGauge();
  private readonly statsPanel = new StatisticsPanel();
  private readonly exportMenu = new ExportMenu();
  private readonly mindMapView = new MindMapView();
  private readonly costCounter = new CostCounter();
  private meeting: Meeting | null = null;

  constructor(private readonly deps: MeetingDetailPageDeps) {}

  async render(root: HTMLElement): Promise<void> {
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

    const result = await this.deps.getMeeting.execute({ id: meetingId });
    const body = root.querySelector<HTMLElement>('#detail-body');
    if (!body) return;
    if (!result.ok) {
      body.innerHTML = `<p class="text-red-600">Error: ${result.error.message}</p>`;
      return;
    }
    if (!result.value) {
      body.innerHTML = `<em class="text-ink-400">Meeting not found.</em>`;
      return;
    }
    this.meeting = result.value;
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
          ${meeting.startedAt.toLocaleString()} · ${meeting.template.kind} · ${meeting.language.code}
        </p>
        <div id="detail-cost" class="mt-3"></div>
      </section>

      ${meeting.temperature ? `
        <section class="card mb-6">
          <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-400">${t.t('home.sentiment')}</h3>
          <div id="detail-temperature"></div>
        </section>` : ''}

      <section class="card mb-6">
        <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-400">${t.t('home.summary')}</h3>
        <div id="detail-summaries"></div>
      </section>

      ${meeting.mindMap ? `
        <section class="card mb-6">
          <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-400">${t.t('home.mind_map')}</h3>
          <div id="detail-mindmap"></div>
        </section>` : ''}

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
      this.gauge.render(target.querySelector<HTMLElement>('#detail-temperature')!, meeting.temperature);
    }
    this.renderSummaries(target.querySelector<HTMLElement>('#detail-summaries')!, meeting);
    if (meeting.mindMap) {
      this.mindMapView.render(target.querySelector<HTMLElement>('#detail-mindmap')!, meeting.mindMap);
    }
    this.statsPanel.render(target.querySelector<HTMLElement>('#detail-stats')!, meeting);
    this.exportMenu.render(target.querySelector<HTMLElement>('#detail-export')!, () => this.meeting, t);
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
        return `<article class="mb-4">
            <h4 class="text-sm font-semibold uppercase tracking-wide text-ink-400">${this.deps.translator.t(SUMMARY_KEYS[kind])}</h4>
            <p class="mt-1 whitespace-pre-wrap">${escape(summary.content)}</p>
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
