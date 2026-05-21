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

export class HomePage implements Page {
  private root: HTMLElement | null = null;
  private meeting: Meeting | null = null;
  private unsubChunks: (() => void) | null = null;
  private readonly counter = new CostCounter();
  private readonly gauge = new TemperatureGauge();
  private readonly scoreParser = new SentimentScoreParser();
  private readonly statsPanel = new StatisticsPanel();
  private readonly exportMenu = new ExportMenu();
  private readonly mindMapView = new MindMapView();

  constructor(private readonly deps: HomePageDeps) {}

  private get t(): Translator {
    return this.deps.config.translator;
  }

  render(root: HTMLElement): void {
    this.root = root;
    const cfg = this.deps.config.get();
    const t = (key: TranslationKey): string => this.t.t(key);
    root.innerHTML = `
      <a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:rounded focus:bg-primary focus:px-3 focus:py-1 focus:text-white focus:z-50">Skip to content</a>
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
          <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div class="flex flex-col gap-3 md:flex-row md:items-end md:gap-6">
              ${templateRadios(cfg.defaultTemplate, t)}
              ${languageSelect(cfg.language, t)}
            </div>
            <div class="flex gap-2">
              <button id="btn-start" class="btn-primary">${t('home.btn_record')}</button>
              <button id="btn-stop" class="btn-ghost" disabled>${t('home.btn_stop')}</button>
            </div>
          </div>
          <p id="status" role="status" aria-live="polite" class="mt-3 text-sm text-ink-400">${t('home.ready')}</p>
          <div id="counter" aria-live="polite" class="mt-3 text-sm text-ink-400"></div>
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
  }

  dispose(): void {
    this.unsubChunks?.();
    this.unsubChunks = null;
    this.counter.stop();
  }

  private bind(): void {
    const startBtn = this.qs<HTMLButtonElement>('#btn-start');
    const stopBtn = this.qs<HTMLButtonElement>('#btn-stop');
    startBtn.addEventListener('click', () => void this.handleStart());
    stopBtn.addEventListener('click', () => void this.handleStop());
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
    this.setStatus(this.t.t('home.recording'));
    this.toggleButtons(true);
    this.qs<HTMLElement>('#transcription').innerHTML = '';
    this.counter.startLive(this.qs<HTMLElement>('#counter'), () => this.meeting);
    this.unsubChunks = this.deps.audio.onChunk((chunk) => void this.handleChunk(chunk));
  }

  private async handleChunk(chunk: AudioChunk): Promise<void> {
    if (!this.meeting) return;
    const result = await this.deps.transcribeChunk.execute({ meeting: this.meeting, chunk });
    if (result.ok) {
      this.appendSegment(result.value);
    } else {
      this.setStatus(`Error: ${result.error.message}`);
    }
  }

  private async handleStop(): Promise<void> {
    if (!this.meeting) return;
    this.toggleButtons(false);
    this.setStatus(this.t.t('home.stopping'));
    this.unsubChunks?.();
    this.unsubChunks = null;
    this.counter.stop();
    await this.deps.stopRecording.execute({ meeting: this.meeting });
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

  private toggleButtons(recording: boolean): void {
    this.qs<HTMLButtonElement>('#btn-start').disabled = recording;
    this.qs<HTMLButtonElement>('#btn-stop').disabled = !recording;
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
