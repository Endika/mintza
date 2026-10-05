import type { FinalizeMeetingUseCase } from '../../application/use-cases/FinalizeMeetingUseCase';
import type { GenerateMindMapUseCase } from '../../application/use-cases/GenerateMindMapUseCase';
import type { GenerateSummariesUseCase } from '../../application/use-cases/GenerateSummariesUseCase';
import type { ListMeetingsUseCase } from '../../application/use-cases/ListMeetingsUseCase';
import type { SaveMeetingUseCase } from '../../application/use-cases/SaveMeetingUseCase';
import type { StartRecordingUseCase } from '../../application/use-cases/StartRecordingUseCase';
import type { StopRecordingUseCase } from '../../application/use-cases/StopRecordingUseCase';
import type { TranscribeChunkUseCase } from '../../application/use-cases/TranscribeChunkUseCase';
import type { ListTemplatesUseCase } from '../../application/use-cases/ListTemplatesUseCase';
import type { AudioCapturePort } from '../../domain/audio/ports/AudioCapturePort';
import type { ScreenWakePort } from '../../domain/system/ports/ScreenWakePort';
import type { AudioChunk } from '../../domain/audio/value-objects/AudioChunk';
import { Language, type LanguageCode } from '../../domain/language/value-objects/Language';
import type { Meeting } from '../../domain/meeting/entities/Meeting';
import type { MeetingListItem } from '../../domain/meeting/ports/MeetingRepository';
import type { MindMap } from '../../domain/mindmap/entities/MindMap';
import type { TemplateRegistry } from '../../domain/meeting/services/TemplateRegistry';
import { Template, type TemplateKind } from '../../domain/meeting/value-objects/Template';
import { SUMMARY_KINDS, type SummaryKind } from '../../domain/summary/value-objects/SummaryKind';
import { SentimentScoreParser } from '../../domain/temperature/services/SentimentScoreParser';
import { estimateOpenAiHourlyCost } from '../../domain/tokens/services/HourlyCostEstimate';
import type { TranscriptSegment } from '../../domain/transcription/entities/TranscriptSegment';
import type { AppError } from '../../shared/errors/AppError';
import type { AppShell } from '../components/AppShell';
import { AudioLevelMeter } from '../components/AudioLevelMeter';
import { CostCounter } from '../components/CostCounter';
import { ExportMenu } from '../components/ExportMenu';
import {
  ICON_ALERT,
  ICON_CHECK,
  ICON_CHEVRON,
  ICON_EXTERNAL,
  ICON_HISTORY,
  ICON_KEY,
  ICON_PAUSE,
  ICON_PLAY,
  ICON_PLUS,
  ICON_RECORD,
  ICON_SPARKLE,
  ICON_STOP,
} from '../components/icons';
import { bindDisclosures, disclosureHtml } from '../components/Disclosure';
import { MindMapView } from '../components/MindMapView';
import { StatisticsPanel } from '../components/StatisticsPanel';
import { TemperatureGauge } from '../components/TemperatureGauge';
import type { Translator } from '../i18n/Translator';
import { errorLines, errorText } from '../i18n/errorText';
import { SUMMARY_LABEL_KEYS } from '../i18n/summaryLabelKey';
import { templateDisplayName } from '../i18n/templateDisplayName';
import type { TranslationKey } from '../i18n/translations';
import { Router, type Page } from '../router/Router';
import type { ConfigStore } from '../state/ConfigStore';
import { formatDuration } from '../util/formatDuration';
import { LANGUAGE_NAMES, languageName } from '../i18n/languageName';
import { orderSummaries } from '../util/orderSummaries';
import { renderMarkdown } from '../util/renderMarkdown';
import { escapeHtml } from '../util/escapeHtml';
import { meetingTitle } from '../util/meetingTitle';
import { metaLine } from '../util/metaLine';
import { LeaveGuard } from '../lifecycle/LeaveGuard';

export interface HomePageDeps {
  readonly config: ConfigStore;
  readonly audio: AudioCapturePort;
  readonly screenWake: ScreenWakePort;
  readonly startRecording: StartRecordingUseCase;
  readonly stopRecording: StopRecordingUseCase;
  readonly transcribeChunk: TranscribeChunkUseCase;
  readonly generateSummaries: GenerateSummariesUseCase;
  readonly generateMindMap: GenerateMindMapUseCase;
  readonly finalizeMeeting: FinalizeMeetingUseCase;
  readonly saveMeeting: SaveMeetingUseCase;
  readonly listTemplates: ListTemplatesUseCase;
  readonly listMeetings: ListMeetingsUseCase;
  readonly templateRegistry: TemplateRegistry;
  readonly shell: Pick<AppShell, 'setBusy'>;
}

type ScreenState = 'idle' | 'recording' | 'paused' | 'processing' | 'done';

type StepState = 'waiting' | 'writing' | 'ready' | 'failed';

interface ChunkProgress {
  received: number;
  transcribed: number;
  skipped: number;
  failed: number;
}

const PANELS: Record<ScreenState, string> = {
  idle: '#panel-idle',
  recording: '#panel-live',
  paused: '#panel-live',
  processing: '#panel-processing',
  done: '#panel-done',
};

const STEP_KEYS: Record<StepState, TranslationKey> = {
  waiting: 'home.step_waiting',
  writing: 'home.step_writing',
  ready: 'home.step_ready',
  failed: 'home.step_failed',
};

const VISIBLE_TEMPLATE_CHIPS = 4;
// Portrait phones dock Record above the tab bar; short landscape ones keep it inline.
const DOCK_QUERY = '(max-width: 767.98px) and (min-height: 500.02px)';
// Summary content headings start at h4: page h1, card h2, summary label h3.
const SUMMARY_HEADING_OFFSET = 3;

export class HomePage implements Page {
  private root: HTMLElement | null = null;
  private meeting: Meeting | null = null;
  private unsubChunks: (() => void) | null = null;
  private readonly pendingChunks: Set<Promise<void>> = new Set();
  private screenState: ScreenState = 'idle';
  private readonly counter = new CostCounter();
  private readonly gauge = new TemperatureGauge();
  private readonly scoreParser = new SentimentScoreParser();
  private readonly statsPanel = new StatisticsPanel();
  private readonly exportMenu = new ExportMenu();
  private readonly mindMapView = new MindMapView();
  private readonly meter = new AudioLevelMeter();
  private kinds: readonly SummaryKind[] = SUMMARY_KINDS;
  private progress: ChunkProgress = {
    received: 0,
    transcribed: 0,
    skipped: 0,
    failed: 0,
  };
  private templates: Template[] = [];
  private selectedTemplate: TemplateKind = 'generic';
  private readonly guard = new LeaveGuard();
  private alive = true;
  private dockQuery: MediaQueryList | null = null;
  private readonly onDockQueryChange = (): void => this.placeDock();
  private transcriptSaved: Promise<boolean> | null = null;
  private persisted = false;
  private transcriptStored = false;

  constructor(private readonly deps: HomePageDeps) {}

  private get t(): Translator {
    return this.deps.config.translator;
  }

  async render(root: HTMLElement): Promise<void> {
    this.root = root;
    const t = (key: TranslationKey): string => this.t.t(key);
    const templatesResult = await this.deps.listTemplates.execute();
    if (!this.alive) return;
    this.templates = templatesResult.ok ? templatesResult.value : [Template.generic()];
    const preferred = this.deps.config.get().defaultTemplate;
    this.selectedTemplate = this.templates.some((tpl) => tpl.id === preferred)
      ? preferred
      : 'generic';
    const hasKey = Boolean(this.deps.config.openAIKey());

    root.innerHTML = `
      <div id="home-wrap" class="home-wrap mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <header id="home-header" class="mb-5 sm:mb-6">
          <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">${t('home.new_meeting')}</h1>
        </header>

        <section id="rec-card" class="card rec-card">
          ${hasKey ? this.recorderMarkup() : this.connectMarkup()}
        </section>

        <section id="rest-section" class="mt-4 hidden">
          <div id="rest-summaries" class="card divide-y divide-line overflow-hidden p-0 sm:p-0"></div>
        </section>

        <section id="more-section" class="mt-10 hidden" aria-labelledby="more-title">
          <h2 id="more-title" class="mb-4 text-xl font-semibold tracking-tight">${t('home.more_about')}</h2>
          <div class="flex flex-col gap-4">
            <section id="temperature-card" class="card hidden">
              <h3 class="mb-3 text-lg font-semibold">${t('home.sentiment')}</h3>
              <div id="temperature"></div>
            </section>
            <section id="mindmap-card" class="card hidden">
              <h3 class="mb-3 text-lg font-semibold">${t('home.mind_map')}</h3>
              <div id="mindmap"></div>
            </section>
            <section id="stats-card" class="card hidden">
              <h3 class="mb-3 text-lg font-semibold">${t('home.statistics')}</h3>
              <div id="stats-body"></div>
            </section>
            <div id="export-card" class="hidden">
              <div id="export-menu"></div>
            </div>
          </div>
        </section>

        <details id="transcript-details" class="card group mt-4 hidden p-0 sm:p-0">
          <summary class="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-[var(--radius-card)] px-5 py-3 font-semibold sm:px-6 [&::-webkit-details-marker]:hidden">
            <span id="transcript-label">${t('home.live_transcript')}</span>
            <span class="text-fg-muted transition-transform duration-150 group-open:rotate-90">${ICON_CHEVRON}</span>
          </summary>
          <div id="transcription" class="whitespace-pre-wrap break-words px-5 pb-5 leading-relaxed text-fg sm:px-6">
            <em class="text-fg-muted">${t('home.transcript_placeholder')}</em>
          </div>
        </details>

        <section id="last-meeting" class="mt-6 hidden" aria-labelledby="last-meeting-title"></section>
      </div>
    `;

    bindDisclosures(this.qs<HTMLElement>('#rest-summaries'));
    if (hasKey) this.bind();
    this.applyScreenState();
    void this.renderLastMeeting();
    if (!templatesResult.ok) {
      this.showLastError(t('home.templates_failed'));
    }
  }

  async canLeave(): Promise<boolean> {
    if (!this.guard.busy) return true;
    const ask = (key: TranslationKey): boolean =>
      this.guard.confirmLeave(this.t.t(key), (m) => window.confirm(m));
    if (this.screenState === 'recording' || this.screenState === 'paused') {
      return ask('home.leave_recording') && this.stop();
    }
    if (this.screenState === 'processing') {
      return ask('home.leave_processing') && ((await this.transcriptSaved) ?? true);
    }
    return ask(this.unsavedPrompt);
  }

  private get unsavedPrompt(): TranslationKey {
    return this.transcriptStored ? 'home.leave_summaries_unsaved' : 'home.leave_unsaved';
  }

  private get hasUnsavedMeeting(): boolean {
    return this.meeting !== null && this.meeting.segments.length > 0 && !this.persisted;
  }

  dispose(): void {
    this.alive = false;
    this.dockQuery?.removeEventListener('change', this.onDockQueryChange);
    this.guard.dispose();
    this.deps.shell.setBusy(false);
    // While processing, handleStop still needs the final chunk the recorder emits on stop.
    if (this.screenState !== 'processing') {
      this.unsubChunks?.();
      this.unsubChunks = null;
    }
    if (this.screenState === 'recording' || this.screenState === 'paused') {
      void this.deps.audio.stop();
    }
    this.counter.stop();
    this.meter.stop();
    this.exportMenu.dispose();
    void this.deps.screenWake.release();
  }

  /** Resolves with whether the transcript reached the repository; summaries keep finalizing after. */
  private stop(): Promise<boolean> {
    this.transcriptSaved ??= new Promise<boolean>((resolve) => {
      this.handleStop(resolve).catch(() => {
        this.showSaveError(this.t.t('error.unknown'));
        this.setScreenState('done');
        resolve(false);
      });
    });
    return this.transcriptSaved;
  }

  private syncWakeLock(active: boolean): void {
    if (active && this.deps.config.keepScreenAwake()) void this.deps.screenWake.request();
    else void this.deps.screenWake.release();
  }

  private connectMarkup(): string {
    const t = (key: TranslationKey, vars?: Record<string, string>): string => this.t.t(key, vars);
    const template =
      this.templates.find((tpl) => tpl.id === this.selectedTemplate) ?? Template.generic();
    const cost = estimateOpenAiHourlyCost(
      this.deps.config.get().summaryQuality,
      template.summaryKinds.length,
    ).format(2);
    const steps: TranslationKey[] = [
      'home.connect_step_account',
      'home.connect_step_key',
      'home.connect_step_paste',
    ];
    return `
      <div id="connect" class="flex flex-col gap-6">
        <div class="flex flex-col gap-4">
          <span class="flex size-12 items-center justify-center rounded-full bg-raised text-fg">${ICON_KEY}</span>
          <div>
            <h2 class="text-2xl font-semibold tracking-tight">${t('home.connect_title')}</h2>
            <p class="mt-2 leading-relaxed text-fg-muted">${t('home.connect_lede')}</p>
          </div>
        </div>
        <ol class="flex flex-col gap-3">
          ${steps
            .map(
              (key, i) => `
            <li class="flex items-start gap-3">
              <span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-raised text-sm font-semibold tabular" aria-hidden="true">${i + 1}</span>
              <span class="pt-0.5">${t(key)}</span>
            </li>`,
            )
            .join('')}
        </ol>
        <p class="rounded-[var(--radius-control)] bg-raised px-4 py-3 text-sm leading-relaxed">${t(
          'home.connect_cost',
          { cost: `<strong class="font-semibold tabular">${cost}</strong>` },
        )}</p>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <a href="#/settings" class="btn-action btn-lg w-full sm:w-auto">${t('home.connect_action')}</a>
          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener" class="btn-ghost">
            <span>${t('home.connect_get_key')}</span>
            <span class="sr-only">${t('home.new_tab')}</span>
            ${ICON_EXTERNAL}
          </a>
        </div>
      </div>
    `;
  }

  private recorderMarkup(): string {
    const t = (key: TranslationKey): string => this.t.t(key);
    const notes = `
      <div id="card-notes" class="flex flex-col gap-1">
        <p id="status" role="status" class="text-sm text-fg-muted empty:sr-only"></p>
        <p id="progress" class="hidden text-sm text-fg-muted tabular"></p>
        <div id="last-error" class="hidden text-sm text-danger"></div>
        <p id="stop-note" class="hidden text-sm text-fg-muted"></p>
      </div>`;
    return `
      <div id="panel-idle" class="flex flex-col gap-6">
        <div>
          <h2 class="text-xl font-semibold tracking-tight">${t('home.record_title')}</h2>
          <p class="mt-1 leading-relaxed text-fg-muted">${t('home.record_hint')}</p>
        </div>
        ${this.templateChooserMarkup()}
        <label class="flex flex-col gap-2 sm:max-w-xs">
          <span class="text-sm font-medium text-fg-muted">${t('home.field_language')}</span>
          ${languageSelect(this.deps.config.spokenLanguage())}
        </label>
        <div id="record-dock" class="record-dock">
          <button id="btn-record" type="button" class="btn-action btn-lg w-full">
            ${ICON_RECORD}<span>${t('home.btn_record')}</span>
          </button>
        </div>
        <div class="idle-notes flex flex-col gap-3" data-slot="idle"></div>
      </div>

      <div id="panel-live" class="flex flex-1 flex-col" hidden>
        <div class="flex min-w-0 items-center justify-between gap-3">
          <h2 id="rec-badge" class="rec-badge shrink-0" tabindex="-1">
            <span class="rec-dot" aria-hidden="true"></span>
            <span id="rec-badge-label">${t('home.rec')}</span>
          </h2>
          <button id="btn-summarize" type="button" class="btn-ghost -mr-3 shrink-0 px-3! text-sm whitespace-nowrap">
            <span class="max-[359px]:hidden">${ICON_SPARKLE}</span><span>${t('home.btn_summarize_now')}</span>
          </button>
        </div>
        <p id="live-context" class="mt-1 truncate text-sm text-fg-muted"></p>
        <div class="flex flex-1 flex-col items-center justify-center gap-8 py-10 text-center">
          <div id="counter"></div>
          <div id="meter" class="hidden w-full max-w-md"></div>
          <div data-slot="live" class="w-full max-w-md"></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <button id="btn-pause" type="button" class="btn-secondary btn-lg">
            <span id="btn-pause-icon">${ICON_PAUSE}</span>
            <span id="btn-pause-label">${t('home.btn_pause')}</span>
          </button>
          <button id="btn-stop" type="button" class="btn-danger btn-lg">
            ${ICON_STOP}<span>${t('home.btn_stop')}</span>
          </button>
        </div>
        <div id="wake-slot" class="mt-3 empty:hidden"></div>
      </div>

      <div id="panel-processing" hidden>
        <h2 id="processing-title" class="text-xl font-semibold tracking-tight" tabindex="-1">${t('home.processing_title')}</h2>
        <div data-slot="processing" class="mt-1"></div>
        <ol id="steps" class="mt-4 divide-y divide-line"></ol>
      </div>

      <div id="panel-done" hidden>
        <h2 id="done-title" class="break-words text-2xl font-semibold tracking-tight" tabindex="-1"></h2>
        <div id="done-meta" class="mt-1"></div>
        <div data-slot="done" class="mt-3"></div>
        <ol id="failed-steps" class="mt-3 divide-y divide-line empty:hidden"></ol>
        <div id="primary-summary" class="mt-5 border-t border-line pt-5"></div>
        <button id="btn-new" type="button" class="btn-secondary mt-6 hidden w-full sm:w-auto">
          ${ICON_PLUS}<span>${t('home.btn_new')}</span>
        </button>
      </div>
      ${notes}
    `;
  }

  private templateChooserMarkup(): string {
    const chips = this.templates.slice(0, VISIBLE_TEMPLATE_CHIPS);
    const overflow = this.templates.length > VISIBLE_TEMPLATE_CHIPS;
    const selectedInOverflow = !chips.some((tpl) => tpl.id === this.selectedTemplate);
    const name = (tpl: Template): string => escapeHtml(templateDisplayName(tpl, this.t));
    return `
      <div class="flex flex-col gap-2">
        <span id="template-label" class="text-sm font-medium text-fg-muted">${this.t.t('home.field_template')}</span>
        <div role="group" aria-labelledby="template-label" class="flex flex-wrap gap-2">
          ${chips
            .map(
              (tpl) =>
                `<button type="button" class="chip" data-template="${escapeHtml(tpl.id)}" aria-pressed="${tpl.id === this.selectedTemplate}">${name(tpl)}</button>`,
            )
            .join('')}
          ${
            overflow
              ? `<button type="button" id="template-more-toggle" class="chip" aria-expanded="${selectedInOverflow}" aria-controls="template-more">${this.t.t('home.template_more')}</button>`
              : ''
          }
        </div>
        ${
          overflow
            ? `<select id="template-more" class="field${selectedInOverflow ? '' : ' hidden'}" aria-labelledby="template-label">
                ${this.templates
                  .map(
                    (tpl) =>
                      `<option value="${escapeHtml(tpl.id)}" ${tpl.id === this.selectedTemplate ? 'selected' : ''}>${name(tpl)}</option>`,
                  )
                  .join('')}
              </select>`
            : ''
        }
      </div>
    `;
  }

  private bind(): void {
    this.qs<HTMLButtonElement>('#btn-record').addEventListener(
      'click',
      () => void this.handleStart(),
    );
    this.qs<HTMLButtonElement>('#btn-pause').addEventListener(
      'click',
      () => void this.handlePauseResume(),
    );
    this.qs<HTMLButtonElement>('#btn-stop').addEventListener('click', () => void this.stop());
    this.qs<HTMLButtonElement>('#btn-summarize').addEventListener(
      'click',
      () => void this.handleSummarizeNow(),
    );
    this.qs<HTMLButtonElement>('#btn-new').addEventListener('click', () => this.handleNewMeeting());
    this.bindTemplateChooser();
    this.renderWakeSwitch(this.qs<HTMLElement>('#wake-slot'));
    if (typeof window.matchMedia === 'function') {
      this.dockQuery = window.matchMedia(DOCK_QUERY);
      this.dockQuery.addEventListener('change', this.onDockQueryChange);
    }
  }

  private bindTemplateChooser(): void {
    const chips = [
      ...this.qs<HTMLElement>('#panel-idle').querySelectorAll<HTMLButtonElement>('[data-template]'),
    ];
    const select = this.qsOptional<HTMLSelectElement>('#template-more');
    const toggle = this.qsOptional<HTMLButtonElement>('#template-more-toggle');
    const choose = (id: TemplateKind): void => {
      this.selectedTemplate = id;
      chips.forEach((chip) =>
        chip.setAttribute('aria-pressed', String(chip.dataset['template'] === id)),
      );
      if (select) select.value = id;
    };
    chips.forEach((chip) =>
      chip.addEventListener('click', () => choose(chip.dataset['template'] ?? 'generic')),
    );
    select?.addEventListener('change', () => choose(select.value));
    toggle?.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      select?.classList.toggle('hidden', !open);
      if (open) select?.focus();
    });
  }

  private async handleStart(): Promise<void> {
    if (!this.deps.config.openAIKey()) {
      this.setStatus(this.t.t('home.configure_key'));
      Router.navigate('/settings');
      return;
    }
    this.setStatus(this.t.t('home.requesting_mic'));
    const language = Language.of(this.readLanguage());
    const template = await this.deps.templateRegistry.resolveOrFallback(this.selectedTemplate);
    if (!this.alive) return;
    const result = await this.deps.startRecording.execute({ template, language });
    if (!this.alive) {
      if (result.ok) void this.deps.audio.stop();
      return;
    }
    if (!result.ok) {
      this.setStatus(this.t.t('home.start_failed'));
      return;
    }
    const meeting = result.value.meeting;
    this.meeting = meeting;
    this.kinds = template.summaryKinds;
    this.progress = { received: 0, transcribed: 0, skipped: 0, failed: 0 };
    this.qs<HTMLElement>('#transcription').innerHTML = '';
    this.qs<HTMLElement>('#last-error').classList.add('hidden');
    this.qs<HTMLElement>('#live-context').innerHTML = metaLine([
      templateDisplayName(meeting.template, this.t),
      languageName(this.readLanguage()),
    ]);
    this.startMeter();
    this.counter.startLive(this.qs<HTMLElement>('#counter'), () => this.meeting, this.t);
    this.unsubChunks = this.deps.audio.onChunk((chunk) => {
      if (meeting.isFinished) return;
      const p = this.handleChunk(meeting, chunk);
      this.pendingChunks.add(p);
      void p.finally(() => this.pendingChunks.delete(p));
    });
    this.setStatus(this.t.t('home.recording'));
    this.setScreenState('recording');
    this.syncWakeLock(true);
  }

  private async handlePauseResume(): Promise<void> {
    if (this.screenState === 'recording') {
      await this.deps.audio.pause();
      if (!this.alive) return;
      this.meeting?.pause();
      this.meter.stop();
      this.qs<HTMLElement>('#meter').classList.add('hidden');
      this.setStatus(this.t.t('home.paused'));
      this.setScreenState('paused');
      this.syncWakeLock(false);
    } else if (this.screenState === 'paused') {
      this.meeting?.resume();
      await this.deps.audio.resume();
      if (!this.alive) return;
      this.startMeter();
      this.counter.startLive(this.qs<HTMLElement>('#counter'), () => this.meeting, this.t);
      this.setStatus(this.t.t('home.recording'));
      this.setScreenState('recording');
      this.syncWakeLock(true);
    }
  }

  private async handleStop(onTranscriptSaved: (saved: boolean) => void): Promise<void> {
    if (!this.meeting) {
      onTranscriptSaved(true);
      return;
    }
    const meeting = this.meeting;
    const { primary, rest } = orderSummaries(meeting.template, this.kinds);
    const steps = primary ? [primary, ...rest] : rest;
    this.renderSteps(meeting, steps);
    this.setStatus(this.t.t('home.generating'));
    this.setScreenState('processing');
    this.syncWakeLock(false);
    this.meter.stop();
    this.qs<HTMLElement>('#meter').classList.add('hidden');
    this.counter.stop();
    try {
      const stopped = await this.deps.stopRecording.execute({
        meeting,
        flushPending: () => Promise.allSettled([...this.pendingChunks]),
      });
      if (stopped.ok && stopped.value.stopTimedOut) this.showStopNote();
    } finally {
      this.unsubChunks?.();
      this.unsubChunks = null;
    }

    if (meeting.segments.length === 0) {
      onTranscriptSaved(true);
      this.setStatus(this.t.t('home.no_audio'));
      this.renderDone(meeting);
      this.setScreenState('done');
      return;
    }

    const transcriptSaved = await this.deps.saveMeeting.execute({ meeting });
    if (transcriptSaved.ok) {
      this.persisted = true;
      this.transcriptStored = true;
    }
    onTranscriptSaved(transcriptSaved.ok);
    if (!transcriptSaved.ok) this.showSaveError(errorText(transcriptSaved.error, this.t));

    steps.forEach((kind) => this.setStep(kind, 'writing'));
    const result = await this.deps.finalizeMeeting.execute({
      meeting,
      kinds: this.kinds,
      onSummary: (attempt) =>
        attempt.result.ok
          ? this.setStep(attempt.kind, 'ready')
          : this.setStep(
              attempt.kind,
              'failed',
              errorLines(attempt.result.error, (k) => this.t.t(k)).join(' · '),
            ),
    });
    this.persisted = result.summariesSaved;

    this.renderDone(meeting);
    this.renderTemperature();
    this.renderStatistics();
    this.renderExportMenu();
    if (result.mindMap) this.renderMindMap(result.mindMap);

    const detail = this.t.t('home.summaries_result', {
      ok: result.summarySuccessCount,
      failed: result.summaryFailureCount,
    });
    if (result.saveError) {
      const what: TranslationKey = result.summariesSaved
        ? 'home.mind_map_save_failed'
        : transcriptSaved.ok
          ? 'home.summaries_save_failed'
          : 'home.save_failed';
      this.showRetrySave(meeting, what, errorText(result.saveError, this.t), detail);
    } else {
      this.showSaved(meeting, detail);
    }
    this.setScreenState('done');
  }

  private showStopNote(): void {
    const note = this.qsOptional('#stop-note');
    if (!note) return;
    note.textContent = this.t.t('home.stop_timed_out');
    note.classList.remove('hidden');
  }

  /** Re-saving the whole meeting stores whatever the last save missed. */
  private showRetrySave(
    meeting: Meeting,
    what: TranslationKey,
    error: string,
    detail: string,
  ): void {
    const status = this.qsOptional('#status');
    if (!status) return;
    this.removeRetrySave();
    status.classList.add('text-danger');
    status.textContent = `${this.t.t(what)} ${error}`;
    this.paintStatus();
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.id = 'btn-retry-save';
    retry.className = 'btn-secondary mt-2 self-start';
    retry.textContent = this.t.t('home.retry_save');
    retry.addEventListener('click', () => {
      void (async () => {
        const hadFocus = document.activeElement === retry;
        retry.disabled = true;
        const saved = await this.deps.saveMeeting.execute({ meeting });
        if (!this.alive || this.meeting !== meeting) return;
        if (saved.ok) {
          this.persisted = true;
          this.syncBusy();
          this.showSaved(meeting, detail);
          if (hadFocus) this.qsOptional('#status a')?.focus();
          return;
        }
        this.showRetrySave(meeting, what, errorText(saved.error, this.t), detail);
        if (hadFocus) this.qsOptional('#btn-retry-save')?.focus();
      })();
    });
    status.after(retry);
  }

  private removeRetrySave(): void {
    this.qsOptional('#btn-retry-save')?.remove();
  }

  private showSaveError(message: string): void {
    const status = this.qsOptional('#status');
    if (!status) return;
    status.textContent = `${this.t.t('home.save_failed')} ${message}`;
    status.classList.add('text-danger');
    this.paintStatus();
  }

  private showSaved(meeting: Meeting, detail: string): void {
    const status = this.qsOptional('#status');
    if (!status) return;
    this.removeRetrySave();
    status.classList.remove('text-danger');
    status.innerHTML = `<a href="#/meeting?id=${escapeHtml(meeting.id.value)}" class="mr-3 font-semibold text-fg underline decoration-line underline-offset-4 hover:decoration-fg">${this.t.t('home.saved_to_history')}</a><span class="tabular">${escapeHtml(detail)}</span>`;
  }

  private handleNewMeeting(): void {
    if (!this.root) return;
    if (
      this.hasUnsavedMeeting &&
      !this.guard.confirmLeave(this.t.t(this.unsavedPrompt), (m) => window.confirm(m))
    ) {
      return;
    }
    this.meeting = null;
    this.transcriptSaved = null;
    this.persisted = false;
    this.transcriptStored = false;
    this.kinds = SUMMARY_KINDS;
    this.progress = { received: 0, transcribed: 0, skipped: 0, failed: 0 };
    this.screenState = 'idle';
    void this.render(this.root);
  }

  private async handleSummarizeNow(): Promise<void> {
    if (!this.meeting) return;
    if (this.meeting.fullText().isEmpty()) {
      this.setStatus(this.t.t('home.no_audio'));
      return;
    }
    const btn = this.qs<HTMLButtonElement>('#btn-summarize');
    btn.disabled = true;
    this.setStatus(this.t.t('home.summarizing'));
    const result = await this.deps.generateSummaries.execute({
      meeting: this.meeting,
      kinds: this.kinds,
    });
    if (!this.alive) return;
    this.renderSummaries();
    this.applyTemperature();
    this.renderStatistics();
    this.renderExportMenu();
    void this.generateAndRenderMindMap();
    btn.disabled = false;
    if (this.screenState === 'recording' || this.screenState === 'paused') {
      this.setStatus(
        `${this.t.t('home.done')} ${this.t.t('home.summaries_result', { ok: result.successCount, failed: result.failureCount })}`,
      );
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

  private async handleChunk(meeting: Meeting, chunk: AudioChunk): Promise<void> {
    this.progress.received += 1;
    this.updateProgress();
    const result = await this.deps.transcribeChunk.execute({ meeting, chunk });
    if (result.ok) {
      if (result.value !== null) {
        this.progress.transcribed += 1;
        this.appendSegment(result.value);
      } else {
        this.progress.skipped += 1;
      }
    } else {
      this.progress.failed += 1;
      this.showLastError(result.error);
    }
    this.updateProgress();
  }

  private updateProgress(): void {
    const el = this.qsOptional('#progress');
    if (!el) return;
    el.classList.remove('hidden');
    const p = this.progress;
    if (p.received === 0) {
      el.textContent = this.t.t('home.chunks_wait');
      return;
    }
    const parts = [
      this.t.t(p.received === 1 ? 'home.progress_one' : 'home.progress', {
        done: p.transcribed,
        total: p.received,
      }),
    ];
    if (p.skipped > 0) {
      parts.push(
        this.t.t(p.skipped === 1 ? 'home.progress_skipped_one' : 'home.progress_skipped', {
          count: p.skipped,
        }),
      );
    }
    if (p.failed > 0) {
      parts.push(
        this.t.t(p.failed === 1 ? 'home.progress_failed_one' : 'home.progress_failed', {
          count: p.failed,
        }),
      );
    }
    el.innerHTML = metaLine(parts);
  }

  /** Takes a provider error, or a line that is already translated. */
  private showLastError(error: AppError | string): void {
    const el = this.qsOptional('#last-error');
    if (!el) return;
    el.classList.remove('hidden');
    const label = this.t.t('home.last_error');
    const lines = typeof error === 'string' ? [error] : errorLines(error, (k) => this.t.t(k));
    if (typeof error === 'string' || error.attempts.length === 0) {
      el.textContent = `${label}: ${lines.join('')}`;
      return;
    }
    el.innerHTML = `<strong>${escapeHtml(label)}</strong><br/>${lines
      .map((line) => `  • ${escapeHtml(line)}`)
      .join('<br/>')}`;
  }

  /** Busy flags change at once; only the card's look waits for the morph. */
  private setScreenState(next: ScreenState): void {
    this.screenState = next;
    this.syncBusy();
    this.morph(() => this.applyScreenState(true));
  }

  private morph(update: () => void): void {
    const card = this.qsOptional('#rec-card');
    if (!card) {
      update();
      return;
    }
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (typeof document.startViewTransition === 'function' && !reduced) {
      document.startViewTransition(() => {
        if (this.alive) update();
      });
      return;
    }
    update();
    card.classList.remove('rec-card-fade');
    // Reading layout restarts the animation when the class comes straight back.
    void card.offsetWidth;
    card.classList.add('rec-card-fade');
  }

  private syncBusy(): void {
    if (!this.alive) return;
    const capturing =
      this.screenState === 'recording' ||
      this.screenState === 'paused' ||
      this.screenState === 'processing';
    this.guard.setBusy(capturing || this.hasUnsavedMeeting);
    this.deps.shell.setBusy(capturing);
  }

  private applyScreenState(moveFocus = false): void {
    if (!this.alive) return;
    this.syncBusy();
    if (!this.root) return;
    const state = this.screenState;
    const live = state === 'recording' || state === 'paused';

    this.qsOptional('#home-header')?.classList.toggle('sr-only', live || state === 'done');
    this.qsOptional('#last-meeting')?.classList.toggle(
      'hidden',
      state !== 'idle' || !this.qsOptional('#last-meeting')?.hasChildNodes(),
    );
    this.qsOptional('#more-section')?.classList.toggle('hidden', state !== 'done' || !this.meeting);
    this.qsOptional('#rest-section')?.classList.toggle(
      'hidden',
      !(live || state === 'done') || !this.qsOptional('#rest-summaries')?.hasChildNodes(),
    );
    const transcript = this.qsOptional('#transcript-details');
    transcript?.classList.toggle('hidden', !(live || (state === 'done' && this.meeting)));
    const transcriptLabel = this.qsOptional('#transcript-label');
    if (transcriptLabel) {
      transcriptLabel.textContent = this.t.t(live ? 'home.live_transcript' : 'home.transcript');
    }

    this.placeDock();
    const card = this.qsOptional('#rec-card');
    if (!card?.querySelector('#panel-idle')) return;
    card.classList.toggle('rec-card-live', live);

    for (const selector of new Set(Object.values(PANELS))) {
      this.qs<HTMLElement>(selector).hidden = selector !== PANELS[state];
    }
    this.qs<HTMLElement>(`[data-slot="${live ? 'live' : state}"]`).append(this.qs('#card-notes'));
    this.paintStatus();
    this.qs<HTMLElement>('#progress').hidden = !live;
    this.qs<HTMLElement>('#btn-new').classList.toggle('hidden', state !== 'done');

    const pauseLabel = this.qs<HTMLElement>('#btn-pause-label');
    const pauseIcon = this.qs<HTMLElement>('#btn-pause-icon');
    const badge = this.qs<HTMLElement>('#rec-badge');
    const badgeLabel = this.qs<HTMLElement>('#rec-badge-label');
    pauseLabel.textContent = this.t.t(state === 'paused' ? 'home.btn_resume' : 'home.btn_pause');
    pauseIcon.innerHTML = state === 'paused' ? ICON_PLAY : ICON_PAUSE;
    badge.classList.toggle('rec-badge-paused', state === 'paused');
    badgeLabel.textContent = this.t.t(state === 'paused' ? 'home.rec_paused' : 'home.rec');

    if (moveFocus) this.keepFocusInView(state);
  }

  /** A fixed descendant of the view-transition card would be captured and morphed with it. */
  private placeDock(): void {
    const wrap = this.qsOptional('#home-wrap');
    const card = this.qsOptional('#rec-card');
    const dock = this.qsOptional('#record-dock');
    const notes = this.qsOptional('#panel-idle .idle-notes');
    const docked =
      this.screenState === 'idle' && this.dockQuery?.matches === true && !!card && !!notes;
    wrap?.toggleAttribute('data-docked', docked && !!dock);
    if (!dock || !card || !notes || docked === (dock.parentElement === wrap)) return;
    const focused = dock.contains(document.activeElement);
    if (docked) card.after(dock);
    else notes.before(dock);
    if (focused && this.screenState === 'idle') this.qsOptional('#btn-record')?.focus();
  }

  /** Hiding the pressed button would drop focus to the body; hand it to the new panel instead. */
  private keepFocusInView(state: ScreenState): void {
    const active = document.activeElement;
    const lost =
      active === null ||
      active === document.body ||
      (active instanceof HTMLElement && active.closest('[hidden], .hidden') !== null);
    if (lost) this.focusPanelHeading(state);
  }

  private focusPanelHeading(state: ScreenState): void {
    const heading: Record<ScreenState, string | null> = {
      idle: null,
      recording: '#rec-badge',
      paused: '#rec-badge',
      processing: '#processing-title',
      done: '#done-title',
    };
    const selector = heading[state];
    if (selector) this.qsOptional(selector)?.focus();
  }

  private renderSteps(meeting: Meeting, kinds: readonly SummaryKind[]): void {
    const list = this.qsOptional('#steps');
    if (!list) return;
    list.innerHTML = kinds
      .map(
        (kind) => `
        <li data-step="${kind}" class="flex items-start gap-3 py-3">
          <span data-step-icon class="mt-0.5 flex size-5 shrink-0 items-center justify-center text-fg-muted">${STEP_DOT}</span>
          <span class="min-w-0 flex-1">
            <span class="block font-medium">${escapeHtml(this.summaryLabel(meeting.template, kind))}</span>
            <span data-step-error class="hidden break-words text-sm text-danger"></span>
          </span>
          <span data-step-state class="mt-0.5 shrink-0 text-sm text-fg-muted">${this.t.t('home.step_waiting')}</span>
        </li>`,
      )
      .join('');
  }

  private setStep(kind: SummaryKind, state: StepState, error?: string): void {
    const row = this.qsOptional(`[data-step="${kind}"]`);
    if (!row) return;
    row.toggleAttribute('data-failed', state === 'failed');
    const icon = row.querySelector<HTMLElement>('[data-step-icon]');
    const label = row.querySelector<HTMLElement>('[data-step-state]');
    const errorEl = row.querySelector<HTMLElement>('[data-step-error]');
    if (label) {
      label.textContent = this.t.t(STEP_KEYS[state]);
      label.classList.toggle('text-danger', state === 'failed');
      label.classList.toggle('font-semibold', state === 'failed');
      label.classList.toggle('text-fg-muted', state !== 'failed');
    }
    if (icon) {
      icon.innerHTML =
        state === 'ready'
          ? ICON_CHECK
          : state === 'failed'
            ? ICON_ALERT
            : state === 'writing'
              ? STEP_PULSE
              : STEP_DOT;
      icon.classList.toggle('text-success', state === 'ready');
      icon.classList.toggle('text-danger', state === 'failed');
      icon.classList.toggle('text-fg-muted', state === 'waiting' || state === 'writing');
    }
    if (errorEl) {
      errorEl.textContent = error ?? '';
      errorEl.classList.toggle('hidden', !error);
    }
  }

  private renderDone(meeting: Meeting): void {
    const title = this.qsOptional('#done-title');
    if (title) title.textContent = meetingTitle(meeting, this.t);
    const meta = this.qsOptional('#done-meta');
    if (meta) this.counter.renderSummaryLine(meta, meeting, this.t);
    const failed = this.root ? [...this.root.querySelectorAll('#steps [data-failed]')] : [];
    this.qsOptional('#failed-steps')?.replaceChildren(...failed);
    this.renderSummaries();
  }

  private renderSummaries(): void {
    if (!this.meeting) return;
    const meeting = this.meeting;
    const gaugeShown = meeting.isFinished && meeting.temperature !== undefined;
    const generated = this.kinds.filter(
      (kind) => meeting.summaries.has(kind) && !(gaugeShown && kind === 'sentiment'),
    );
    const { primary, rest } = orderSummaries(meeting.template, generated);
    const primaryEl = this.qsOptional('#primary-summary');
    const restEl = this.qsOptional('#rest-summaries');
    const finished = meeting.isFinished;

    if (primaryEl) {
      primaryEl.innerHTML =
        finished && primary
          ? `<h3 class="text-lg font-semibold">${escapeHtml(this.summaryLabel(meeting.template, primary))}</h3>
             <div class="prose-summary mt-2 leading-relaxed">${this.summaryHtml(primary)}</div>`
          : `<p class="text-fg-muted">${this.t.t('detail.no_summaries')}</p>`;
    }
    if (restEl) {
      const listed = finished ? rest : primary ? [primary, ...rest] : [];
      restEl.innerHTML = listed
        .map((kind, i) =>
          disclosureHtml({
            id: `home-result-${kind}`,
            kind,
            label: escapeHtml(this.summaryLabel(meeting.template, kind)),
            bodyHtml: this.summaryHtml(kind),
            expanded: !finished && i === 0,
          }),
        )
        .join('');
    }
    this.applyScreenState();
  }

  private summaryHtml(kind: SummaryKind): string {
    const summary = this.meeting?.summaries.get(kind);
    return summary
      ? renderMarkdown(summary.content, { headingOffset: SUMMARY_HEADING_OFFSET })
      : '';
  }

  private summaryLabel(template: Template, kind: SummaryKind): string {
    return template.labelFor(kind, this.t.t(SUMMARY_LABEL_KEYS[kind]));
  }

  private async renderLastMeeting(): Promise<void> {
    const result = await this.deps.listMeetings.execute();
    const section = this.qsOptional('#last-meeting');
    if (!result.ok || !section) return;
    const last = [...result.value].sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0];
    if (!last) return;
    section.innerHTML = `
      <h2 id="last-meeting-title" class="mb-2 px-1 text-sm font-medium text-fg-muted">${this.t.t('home.last_meeting')}</h2>
      <a href="#/meeting?id=${escapeHtml(last.id.value)}" class="card flex items-center gap-4 transition-colors duration-150 hover:bg-raised sm:p-5">
        <span class="flex size-11 shrink-0 items-center justify-center rounded-full bg-raised text-fg">${ICON_HISTORY}</span>
        <span class="min-w-0 flex-1">
          <span class="block truncate font-semibold">${escapeHtml(meetingTitle(last, this.t))}</span>
          <span class="block text-sm text-fg-muted tabular">${metaLine(this.lastMeetingMeta(last))}</span>
        </span>
        <span class="shrink-0 text-fg-muted">${ICON_CHEVRON}</span>
      </a>
    `;
    this.applyScreenState();
  }

  private lastMeetingMeta(item: MeetingListItem): string[] {
    const when = new Intl.DateTimeFormat(document.documentElement.lang || undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(item.startedAt);
    const template = this.templates.find((tpl) => tpl.id === item.templateKind);
    const parts = [when, formatDuration(item.durationMs / 1000, this.t.language)];
    if (template) parts.push(templateDisplayName(template, this.t));
    return parts;
  }

  private async generateAndRenderMindMap(): Promise<void> {
    if (!this.meeting) return;
    const result = await this.deps.generateMindMap.execute({ meeting: this.meeting });
    if (!result.ok) {
      this.showLastError(result.error);
      return;
    }
    this.renderMindMap(result.value);
  }

  private renderMindMap(mindMap: MindMap): void {
    const card = this.qsOptional('#mindmap-card');
    const body = this.qsOptional('#mindmap');
    if (!card || !body) return;
    card.classList.remove('hidden');
    this.mindMapView.render(body, mindMap);
  }

  private renderTemperature(): void {
    if (!this.meeting) return;
    const score = this.meeting.temperature;
    if (!score) return;
    const card = this.qsOptional('#temperature-card');
    const body = this.qsOptional('#temperature');
    if (!card || !body) return;
    card.classList.remove('hidden');
    this.gauge.render(body, score, this.t);
  }

  private renderStatistics(): void {
    if (!this.meeting) return;
    const card = this.qsOptional('#stats-card');
    const body = this.qsOptional('#stats-body');
    if (!card || !body) return;
    card.classList.remove('hidden');
    this.statsPanel.render(body, this.meeting, this.t);
  }

  private renderExportMenu(): void {
    const card = this.qsOptional('#export-card');
    const body = this.qsOptional('#export-menu');
    if (!card || !body) return;
    card.classList.remove('hidden');
    this.exportMenu.render(body, () => this.meeting, this.t);
  }

  private applyTemperature(): void {
    if (!this.meeting) return;
    const sentiment = this.meeting.summaries.get('sentiment');
    if (!sentiment) return;
    const score = this.scoreParser.parse(sentiment.content);
    if (!score) return;
    this.meeting.setTemperature(score);
    const card = this.qsOptional('#temperature-card');
    const body = this.qsOptional('#temperature');
    if (!card || !body) return;
    card.classList.remove('hidden');
    this.gauge.render(body, score, this.t);
  }

  private appendSegment(segment: TranscriptSegment): void {
    const container = this.qsOptional('#transcription');
    if (!container) return;
    const span = document.createElement('span');
    span.textContent = `${segment.text.value} `;
    container.appendChild(span);
  }

  private renderWakeSwitch(container: HTMLElement): void {
    if (!this.deps.screenWake.isSupported()) return;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.id = 'wake-switch';
    toggle.className = 'switch';
    toggle.setAttribute('role', 'switch');
    toggle.innerHTML = `<span class="switch-track" aria-hidden="true"><span class="switch-thumb"></span></span><span>${this.t.t('home.keep_awake_on')}</span>`;
    const paint = (): void => {
      toggle.setAttribute('aria-checked', String(this.deps.config.keepScreenAwake()));
    };
    toggle.addEventListener('click', () => {
      void (async () => {
        const next = !this.deps.config.keepScreenAwake();
        await this.deps.config.update({ ...this.deps.config.get(), keepScreenAwake: next });
        paint();
        this.syncWakeLock(this.screenState === 'recording');
      })();
    });
    paint();
    container.appendChild(toggle);
  }

  private readLanguage(): LanguageCode {
    const select = this.qs<HTMLSelectElement>('#lang-select');
    return select.value as LanguageCode;
  }

  /** The badge and the processing heading already say what the status says; errors always show. */
  private paintStatus(): void {
    const status = this.qsOptional('#status');
    if (!status) return;
    const echoed =
      this.screenState === 'recording' ||
      this.screenState === 'paused' ||
      this.screenState === 'processing';
    status.classList.toggle('sr-only', echoed && !status.classList.contains('text-danger'));
  }

  private setStatus(message: string): void {
    const status = this.qsOptional('#status');
    if (!status) return;
    status.classList.remove('text-danger');
    status.textContent = message;
    this.paintStatus();
  }

  /** Null once disposed: the root may already hold the next page's elements with the same ids. */
  private qsOptional<T extends HTMLElement = HTMLElement>(selector: string): T | null {
    if (!this.alive || !this.root) return null;
    return this.root.querySelector<T>(selector);
  }

  private qs<T extends HTMLElement>(selector: string): T {
    if (!this.root) throw new Error('HomePage not rendered yet');
    const el = this.root.querySelector<T>(selector);
    if (!el) throw new Error(`Missing element ${selector}`);
    return el;
  }
}

const STEP_DOT = `<span class="size-2.5 rounded-full border-2 border-current"></span>`;
const STEP_PULSE = `<span class="size-2.5 animate-rec-pulse rounded-full bg-fg motion-reduce:animate-none"></span>`;

const languageSelect = (current: LanguageCode): string => `
  <select id="lang-select" class="field">
    ${(Object.keys(LANGUAGE_NAMES) as LanguageCode[])
      .map(
        (code) =>
          `<option value="${code}" ${code === current ? 'selected' : ''}>${LANGUAGE_NAMES[code]}</option>`,
      )
      .join('')}
  </select>
`;
