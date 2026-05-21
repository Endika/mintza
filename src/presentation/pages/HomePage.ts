import type { GenerateMindMapUseCase } from '../../application/use-cases/GenerateMindMapUseCase';
import type { GenerateSummariesUseCase } from '../../application/use-cases/GenerateSummariesUseCase';
import type { SaveMeetingUseCase } from '../../application/use-cases/SaveMeetingUseCase';
import type { StartRecordingUseCase } from '../../application/use-cases/StartRecordingUseCase';
import type { StopRecordingUseCase } from '../../application/use-cases/StopRecordingUseCase';
import type { TranscribeChunkUseCase } from '../../application/use-cases/TranscribeChunkUseCase';
import type { AudioCapturePort } from '../../domain/audio/ports/AudioCapturePort';
import type { AudioChunk } from '../../domain/audio/value-objects/AudioChunk';
import { Language, type LanguageCode } from '../../domain/language/value-objects/Language';
import type { Meeting } from '../../domain/meeting/entities/Meeting';
import { Template, type TemplateKind } from '../../domain/meeting/value-objects/Template';
import { SUMMARY_KINDS, type SummaryKind } from '../../domain/summary/value-objects/SummaryKind';
import { SentimentScoreParser } from '../../domain/temperature/services/SentimentScoreParser';
import type { TranscriptSegment } from '../../domain/transcription/entities/TranscriptSegment';
import type { ProviderAttempt } from '../../shared/errors/AppError';
import { AudioLevelMeter } from '../components/AudioLevelMeter';
import { CostCounter } from '../components/CostCounter';
import { ExportMenu } from '../components/ExportMenu';
import { MindMapView } from '../components/MindMapView';
import { StatisticsPanel } from '../components/StatisticsPanel';
import { TemperatureGauge } from '../components/TemperatureGauge';
import type { Translator } from '../i18n/Translator';
import type { TranslationKey } from '../i18n/translations';
import { Router, type Page } from '../router/Router';
import type { ConfigStore } from '../state/ConfigStore';

export interface HomePageDeps {
  readonly config: ConfigStore;
  readonly audio: AudioCapturePort;
  readonly startRecording: StartRecordingUseCase;
  readonly stopRecording: StopRecordingUseCase;
  readonly transcribeChunk: TranscribeChunkUseCase;
  readonly generateSummaries: GenerateSummariesUseCase;
  readonly generateMindMap: GenerateMindMapUseCase;
  readonly saveMeeting: SaveMeetingUseCase;
}

type ScreenState = 'idle' | 'recording' | 'paused' | 'processing' | 'done';

interface ChunkProgress {
  received: number;
  transcribed: number;
  failed: number;
  lastError: string | null;
}

export class HomePage implements Page {
  private root: HTMLElement | null = null;
  private meeting: Meeting | null = null;
  private unsubChunks: (() => void) | null = null;
  private screenState: ScreenState = 'idle';
  private readonly counter = new CostCounter();
  private readonly gauge = new TemperatureGauge();
  private readonly scoreParser = new SentimentScoreParser();
  private readonly statsPanel = new StatisticsPanel();
  private readonly exportMenu = new ExportMenu();
  private readonly mindMapView = new MindMapView();
  private readonly meter = new AudioLevelMeter();
  private progress: ChunkProgress = { received: 0, transcribed: 0, failed: 0, lastError: null };

  constructor(private readonly deps: HomePageDeps) {}

  private get t(): Translator {
    return this.deps.config.translator;
  }

  render(root: HTMLElement): void {
    this.root = root;
    const cfg = this.deps.config.get();
    const t = (key: TranslationKey): string => this.t.t(key);
    root.innerHTML = `
      <a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:rounded focus:bg-primary focus:px-3 focus:py-1 focus:text-white focus:z-50">${t('home.skip')}</a>
      <main id="main" class="mx-auto max-w-3xl px-6 py-12">
        <header class="mb-8 flex items-center justify-between">
          <div>
            <h1 class="text-4xl font-bold tracking-tight">MINTZA</h1>
            <p class="mt-1 text-sm text-ink-400">${t('app.tagline')}</p>
          </div>
          <nav class="flex gap-2 text-sm">
            <a href="#/history" class="btn-ghost">${t('nav.history')}</a>
            <a href="#/settings" class="btn-ghost">${t('nav.settings')}</a>
          </nav>
        </header>

        <section class="card mb-6">
          <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between gap-4">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-6">
                ${templateRadios(cfg.defaultTemplate, t)}
                ${languageSelect(cfg.language, t)}
              </div>
              <span id="rec-badge" class="rec-badge hidden" aria-live="polite">
                <span class="rec-dot" aria-hidden="true"></span>
                <span id="rec-badge-label">${t('home.rec')}</span>
              </span>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <button id="btn-record" class="btn-primary" aria-label="${t('home.btn_record')}" title="${t('home.btn_record')}">
                ${ICON_RECORD}
                <span>${t('home.btn_record')}</span>
              </button>
              <button id="btn-pause" class="btn-ghost" disabled aria-label="${t('home.btn_pause')}" title="${t('home.btn_pause')}">
                <span id="btn-pause-icon">${ICON_PAUSE}</span>
                <span id="btn-pause-label">${t('home.btn_pause')}</span>
              </button>
              <button id="btn-stop" class="btn-danger" disabled aria-label="${t('home.btn_stop')}" title="${t('home.btn_stop')}">
                ${ICON_STOP}
                <span>${t('home.btn_stop')}</span>
              </button>
              <button id="btn-summarize" class="btn-ghost hidden" aria-label="${t('home.btn_summarize_now')}" title="${t('home.btn_summarize_now')}">
                ${ICON_SPARKLE}
                <span>${t('home.btn_summarize_now')}</span>
              </button>
              <button id="btn-new" class="btn-ghost hidden" aria-label="${t('home.btn_new')}" title="${t('home.btn_new')}">
                ${ICON_PLUS}
                <span>${t('home.btn_new')}</span>
              </button>
            </div>
            <p id="status" role="status" aria-live="polite" class="text-sm text-ink-400">${t('home.ready')}</p>
            <div id="meter" class="hidden"></div>
            <div id="progress" class="text-xs text-ink-400 hidden"></div>
            <div id="last-error" class="text-xs text-red-600 hidden"></div>
            <div id="counter" aria-live="polite" class="text-sm text-ink-400"></div>
          </div>
        </section>

        <section id="temperature-card" class="card mb-6 hidden">
          <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-400">${t('home.sentiment')}</h3>
          <div id="temperature"></div>
        </section>

        <section class="card mb-6">
          <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-400">${t('home.transcript')}</h3>
          <div id="transcription" class="min-h-[120px] whitespace-pre-wrap text-ink-600">
            <em class="text-ink-400">${t('home.transcript_placeholder')}</em>
          </div>
        </section>

        <section class="card mb-6">
          <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-400">${t('home.summary')}</h3>
          <div id="summaries" class="text-ink-600">
            <em class="text-ink-400">${t('home.summary_placeholder')}</em>
          </div>
        </section>

        <section id="mindmap-card" class="card mb-6 hidden">
          <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-400">${t('home.mind_map')}</h3>
          <div id="mindmap"></div>
        </section>

        <section id="stats-card" class="card mb-6 hidden">
          <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-400">${t('home.statistics')}</h3>
          <div id="stats-body"></div>
        </section>

        <section id="export-card" class="card hidden">
          <div id="export-menu"></div>
        </section>
      </main>
    `;

    this.bind();
    this.applyScreenState();
  }

  dispose(): void {
    this.unsubChunks?.();
    this.unsubChunks = null;
    this.counter.stop();
    this.meter.stop();
  }

  private bind(): void {
    this.qs<HTMLButtonElement>('#btn-record').addEventListener('click', () => void this.handleStart());
    this.qs<HTMLButtonElement>('#btn-pause').addEventListener('click', () => void this.handlePauseResume());
    this.qs<HTMLButtonElement>('#btn-stop').addEventListener('click', () => void this.handleStop());
    this.qs<HTMLButtonElement>('#btn-summarize').addEventListener('click', () => void this.handleSummarizeNow());
    this.qs<HTMLButtonElement>('#btn-new').addEventListener('click', () => this.handleNewMeeting());
  }

  private async handleStart(): Promise<void> {
    if (!this.deps.config.openAIKey()) {
      this.setStatus(this.t.t('home.configure_key'));
      Router.navigate('/settings');
      return;
    }
    this.setStatus(this.t.t('home.requesting_mic'));
    const result = await this.deps.startRecording.execute({
      template: Template.of(this.readTemplate()),
      language: Language.of(this.readLanguage()),
    });
    if (!result.ok) {
      this.setStatus(result.error.message);
      return;
    }
    this.meeting = result.value.meeting;
    this.progress = { received: 0, transcribed: 0, failed: 0, lastError: null };
    this.qs<HTMLElement>('#transcription').innerHTML = '';
    this.qs<HTMLElement>('#last-error').classList.add('hidden');
    this.startMeter();
    this.counter.startLive(this.qs<HTMLElement>('#counter'), () => this.meeting);
    this.unsubChunks = this.deps.audio.onChunk((chunk) => void this.handleChunk(chunk));
    this.setScreenState('recording');
  }

  private async handlePauseResume(): Promise<void> {
    if (this.screenState === 'recording') {
      await this.deps.audio.pause();
      this.setScreenState('paused');
      this.setStatus(this.t.t('home.paused'));
    } else if (this.screenState === 'paused') {
      await this.deps.audio.resume();
      this.setScreenState('recording');
    }
  }

  private async handleStop(): Promise<void> {
    if (!this.meeting) return;
    this.setScreenState('processing');
    this.setStatus(this.t.t('home.stopping'));
    this.unsubChunks?.();
    this.unsubChunks = null;
    this.meter.stop();
    this.qs<HTMLElement>('#meter').classList.add('hidden');
    this.counter.stop();
    await this.deps.stopRecording.execute({ meeting: this.meeting });

    if (this.meeting.segments.length === 0) {
      this.setStatus(this.t.t('home.no_audio'));
      this.setScreenState('done');
      return;
    }

    this.setStatus(this.t.t('home.generating'));
    const summariesEl = this.qs<HTMLElement>('#summaries');
    summariesEl.innerHTML = '<em class="text-ink-400">…</em>';
    const result = await this.deps.generateSummaries.execute({
      meeting: this.meeting,
      kinds: SUMMARY_KINDS,
    });
    this.renderSummaries(summariesEl);
    this.applyTemperature();
    this.renderStatistics();
    this.renderExportMenu();
    void this.generateAndRenderMindMap();
    this.counter.renderFinal(this.qs<HTMLElement>('#counter'), this.meeting);
    await this.deps.saveMeeting.execute({ meeting: this.meeting });
    this.setStatus(
      `${this.t.t('home.done')} ${result.successCount} ok / ${result.failureCount} failed.`,
    );
    this.setScreenState('done');
  }

  private handleNewMeeting(): void {
    if (!this.root) return;
    this.meeting = null;
    this.progress = { received: 0, transcribed: 0, failed: 0, lastError: null };
    this.render(this.root);
  }

  private async handleSummarizeNow(): Promise<void> {
    if (!this.meeting) return;
    if (this.meeting.fullText().isEmpty()) {
      this.setStatus(this.t.t('home.no_audio'));
      return;
    }
    const btn = this.qs<HTMLButtonElement>('#btn-summarize');
    btn.disabled = true;
    const previousStatus = this.qs<HTMLElement>('#status').textContent ?? '';
    this.setStatus(this.t.t('home.summarizing'));
    const result = await this.deps.generateSummaries.execute({
      meeting: this.meeting,
      kinds: SUMMARY_KINDS,
    });
    this.renderSummaries(this.qs<HTMLElement>('#summaries'));
    this.applyTemperature();
    this.renderStatistics();
    this.renderExportMenu();
    void this.generateAndRenderMindMap();
    btn.disabled = this.screenState !== 'recording' && this.screenState !== 'paused';
    if (this.screenState === 'recording' || this.screenState === 'paused') {
      this.setStatus(
        `${this.t.t('home.done')} ${result.successCount} ok / ${result.failureCount} failed.`,
      );
      window.setTimeout(() => {
        if (this.screenState === 'recording') this.setStatus(this.t.t('home.recording'));
        else if (this.screenState === 'paused') this.setStatus(this.t.t('home.paused'));
      }, 2500);
    } else {
      this.setStatus(previousStatus);
    }
  }

  private startMeter(): void {
    const stream = this.deps.audio.getStream();
    const meterEl = this.qs<HTMLElement>('#meter');
    if (!stream) {
      meterEl.classList.add('hidden');
      return;
    }
    meterEl.classList.remove('hidden');
    this.meter.start(meterEl, stream, this.t);
  }

  private async handleChunk(chunk: AudioChunk): Promise<void> {
    if (!this.meeting) return;
    this.progress.received += 1;
    this.updateProgress();
    const result = await this.deps.transcribeChunk.execute({ meeting: this.meeting, chunk });
    if (result.ok) {
      this.progress.transcribed += 1;
      this.appendSegment(result.value);
    } else {
      this.progress.failed += 1;
      this.progress.lastError = result.error.message;
      this.showLastError(result.error.message, result.error.attempts);
    }
    this.updateProgress();
  }

  private updateProgress(): void {
    const el = this.qs<HTMLElement>('#progress');
    el.classList.remove('hidden');
    const p = this.progress;
    if (p.received === 0) {
      el.textContent = this.t.t('home.chunks_wait');
      return;
    }
    el.textContent = this.t
      .t('home.chunks_progress')
      .replace('{received}', String(p.received))
      .replace('{transcribed}', String(p.transcribed))
      .replace('{failed}', String(p.failed));
  }

  private showLastError(message: string, attempts: readonly ProviderAttempt[] = []): void {
    const el = this.qs<HTMLElement>('#last-error');
    el.classList.remove('hidden');
    const label = this.t.t('home.last_error');
    if (attempts.length === 0) {
      el.textContent = `${label}: ${message}`;
      return;
    }
    const lines = attempts
      .map((a) => `  • ${escapeHtml(a.provider)}: ${escapeHtml(a.message)}`)
      .join('<br/>');
    el.innerHTML = `<strong>${escapeHtml(message)}</strong><br/>${lines}`;
  }

  private setScreenState(next: ScreenState): void {
    this.screenState = next;
    this.applyScreenState();
  }

  private applyScreenState(): void {
    if (!this.root) return;
    const recordBtn = this.qs<HTMLButtonElement>('#btn-record');
    const pauseBtn = this.qs<HTMLButtonElement>('#btn-pause');
    const pauseLabel = this.qs<HTMLElement>('#btn-pause-label');
    const pauseIcon = this.qs<HTMLElement>('#btn-pause-icon');
    const stopBtn = this.qs<HTMLButtonElement>('#btn-stop');
    const summarizeBtn = this.qs<HTMLButtonElement>('#btn-summarize');
    const newBtn = this.qs<HTMLButtonElement>('#btn-new');
    const badge = this.qs<HTMLElement>('#rec-badge');
    const badgeLabel = this.qs<HTMLElement>('#rec-badge-label');

    switch (this.screenState) {
      case 'idle':
        recordBtn.disabled = false;
        pauseBtn.disabled = true;
        stopBtn.disabled = true;
        pauseLabel.textContent = this.t.t('home.btn_pause');
        pauseIcon.innerHTML = ICON_PAUSE;
        pauseBtn.setAttribute('aria-label', this.t.t('home.btn_pause'));
        summarizeBtn.classList.add('hidden');
        newBtn.classList.add('hidden');
        badge.classList.add('hidden');
        break;
      case 'recording':
        recordBtn.disabled = true;
        pauseBtn.disabled = false;
        stopBtn.disabled = false;
        pauseLabel.textContent = this.t.t('home.btn_pause');
        pauseIcon.innerHTML = ICON_PAUSE;
        pauseBtn.setAttribute('aria-label', this.t.t('home.btn_pause'));
        summarizeBtn.classList.remove('hidden');
        summarizeBtn.disabled = false;
        newBtn.classList.add('hidden');
        badge.classList.remove('hidden', 'rec-badge-paused');
        badge.classList.add('rec-badge');
        badgeLabel.textContent = this.t.t('home.rec');
        this.setStatus(this.t.t('home.recording'));
        break;
      case 'paused':
        recordBtn.disabled = true;
        pauseBtn.disabled = false;
        stopBtn.disabled = false;
        pauseLabel.textContent = this.t.t('home.btn_resume');
        pauseIcon.innerHTML = ICON_PLAY;
        pauseBtn.setAttribute('aria-label', this.t.t('home.btn_resume'));
        summarizeBtn.classList.remove('hidden');
        summarizeBtn.disabled = false;
        newBtn.classList.add('hidden');
        badge.classList.remove('hidden', 'rec-badge');
        badge.classList.add('rec-badge-paused');
        badgeLabel.textContent = this.t.t('home.rec_paused');
        break;
      case 'processing':
        recordBtn.disabled = true;
        pauseBtn.disabled = true;
        stopBtn.disabled = true;
        summarizeBtn.classList.add('hidden');
        newBtn.classList.add('hidden');
        badge.classList.add('hidden');
        break;
      case 'done':
        recordBtn.disabled = true;
        pauseBtn.disabled = true;
        stopBtn.disabled = true;
        summarizeBtn.classList.add('hidden');
        newBtn.classList.remove('hidden');
        badge.classList.add('hidden');
        break;
    }
  }

  private async generateAndRenderMindMap(): Promise<void> {
    if (!this.meeting) return;
    const result = await this.deps.generateMindMap.execute({ meeting: this.meeting });
    if (!result.ok) return;
    const card = this.qs<HTMLElement>('#mindmap-card');
    card.classList.remove('hidden');
    this.mindMapView.render(this.qs<HTMLElement>('#mindmap'), result.value);
  }

  private renderStatistics(): void {
    if (!this.meeting) return;
    const card = this.qs<HTMLElement>('#stats-card');
    card.classList.remove('hidden');
    this.statsPanel.render(this.qs<HTMLElement>('#stats-body'), this.meeting);
  }

  private renderExportMenu(): void {
    const card = this.qs<HTMLElement>('#export-card');
    card.classList.remove('hidden');
    this.exportMenu.render(this.qs<HTMLElement>('#export-menu'), () => this.meeting, this.t);
  }

  private applyTemperature(): void {
    if (!this.meeting) return;
    const sentiment = this.meeting.summaries.get('sentiment');
    if (!sentiment) return;
    const score = this.scoreParser.parse(sentiment.content);
    if (!score) return;
    this.meeting.setTemperature(score);
    const card = this.qs<HTMLElement>('#temperature-card');
    card.classList.remove('hidden');
    this.gauge.render(this.qs<HTMLElement>('#temperature'), score);
  }

  private appendSegment(segment: TranscriptSegment): void {
    const container = this.qs<HTMLElement>('#transcription');
    const span = document.createElement('span');
    span.textContent = `${segment.text.value} `;
    container.appendChild(span);
  }

  private renderSummaries(target: HTMLElement): void {
    if (!this.meeting) return;
    const summaries = this.meeting.summaries;
    if (summaries.size === 0) {
      target.innerHTML = `<em class="text-ink-400">${this.t.t('home.summary_placeholder')}</em>`;
      return;
    }
    const order = this.meeting.template.featuredSummaryOrder();
    target.innerHTML = order
      .map((kind) => {
        const summary = summaries.get(kind);
        if (!summary) return '';
        return `<article class="mb-4">
            <h4 class="text-sm font-semibold uppercase tracking-wide text-ink-400">${this.t.t(SUMMARY_KEYS[kind])}</h4>
            <p class="mt-1 whitespace-pre-wrap">${escapeHtml(summary.content)}</p>
          </article>`;
      })
      .join('');
  }

  private readTemplate(): TemplateKind {
    const input = this.qs<HTMLInputElement>('input[name="template"]:checked');
    return input.value as TemplateKind;
  }

  private readLanguage(): LanguageCode {
    const select = this.qs<HTMLSelectElement>('#lang-select');
    return select.value as LanguageCode;
  }

  private setStatus(message: string): void {
    this.qs<HTMLElement>('#status').textContent = message;
  }

  private qs<T extends HTMLElement>(selector: string): T {
    if (!this.root) throw new Error('HomePage not rendered yet');
    const el = this.root.querySelector<T>(selector);
    if (!el) throw new Error(`Missing element ${selector}`);
    return el;
  }
}

const ICON_RECORD = `<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true"><circle cx="7" cy="7" r="5"/></svg>`;
const ICON_PAUSE = `<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true"><rect x="3" y="2" width="3" height="10" rx="1"/><rect x="8" y="2" width="3" height="10" rx="1"/></svg>`;
const ICON_PLAY = `<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true"><path d="M3 2.5v9l8-4.5z"/></svg>`;
const ICON_STOP = `<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="1"/></svg>`;
const ICON_SPARKLE = `<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true"><path d="M7 1l1.5 4L13 6.5 8.5 8 7 13 5.5 8 1 6.5 5.5 5 7 1z"/></svg>`;
const ICON_PLUS = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M7 2v10M2 7h10"/></svg>`;

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

const templateRadios = (
  current: TemplateKind,
  t: (key: TranslationKey) => string,
): string => `
  <fieldset>
    <legend class="block text-xs font-semibold uppercase tracking-wide text-ink-400 mb-1">${t('home.field_template')}</legend>
    <div class="flex gap-3 text-sm">
      ${templateRadio('generic', t('template.generic'), current)}
      ${templateRadio('work', t('template.work'), current)}
      ${templateRadio('interview', t('template.interview'), current)}
    </div>
  </fieldset>
`;

const templateRadio = (value: TemplateKind, label: string, current: TemplateKind): string => `
  <label class="inline-flex items-center gap-1.5 cursor-pointer">
    <input type="radio" name="template" value="${value}" ${value === current ? 'checked' : ''} />
    <span>${label}</span>
  </label>
`;

const languageSelect = (
  current: LanguageCode,
  t: (key: TranslationKey) => string,
): string => `
  <label class="block">
    <span class="block text-xs font-semibold uppercase tracking-wide text-ink-400 mb-1">${t('home.field_language')}</span>
    <select id="lang-select" class="rounded-lg border border-ink-100 px-2 py-1 text-sm">
      <option value="en" ${current === 'en' ? 'selected' : ''}>English</option>
      <option value="es" ${current === 'es' ? 'selected' : ''}>Español</option>
      <option value="eu" ${current === 'eu' ? 'selected' : ''}>Euskara</option>
    </select>
  </label>
`;

const escapeHtml = (raw: string): string =>
  raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
