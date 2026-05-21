import type { StartRecordingUseCase } from '../../application/use-cases/StartRecordingUseCase';
import type { StopRecordingUseCase } from '../../application/use-cases/StopRecordingUseCase';
import type { TranscribeChunkUseCase } from '../../application/use-cases/TranscribeChunkUseCase';
import type { GenerateSummariesUseCase } from '../../application/use-cases/GenerateSummariesUseCase';
import type { SaveMeetingUseCase } from '../../application/use-cases/SaveMeetingUseCase';
import type { AudioCapturePort } from '../../domain/audio/ports/AudioCapturePort';
import type { AudioChunk } from '../../domain/audio/value-objects/AudioChunk';
import { Language, type LanguageCode } from '../../domain/language/value-objects/Language';
import type { Meeting } from '../../domain/meeting/entities/Meeting';
import { Template, type TemplateKind } from '../../domain/meeting/value-objects/Template';
import { SUMMARY_KINDS, type SummaryKind } from '../../domain/summary/value-objects/SummaryKind';
import type { TranscriptSegment } from '../../domain/transcription/entities/TranscriptSegment';
import type { ConfigStore } from '../state/ConfigStore';
import { Router, type Page } from '../router/Router';

export interface HomePageDeps {
  readonly config: ConfigStore;
  readonly audio: AudioCapturePort;
  readonly startRecording: StartRecordingUseCase;
  readonly stopRecording: StopRecordingUseCase;
  readonly transcribeChunk: TranscribeChunkUseCase;
  readonly generateSummaries: GenerateSummariesUseCase;
  readonly saveMeeting: SaveMeetingUseCase;
}

export class HomePage implements Page {
  private root: HTMLElement | null = null;
  private meeting: Meeting | null = null;
  private unsubChunks: (() => void) | null = null;

  constructor(private readonly deps: HomePageDeps) {}

  render(root: HTMLElement): void {
    this.root = root;
    const cfg = this.deps.config.get();
    root.innerHTML = `
      <main class="mx-auto max-w-3xl px-6 py-12">
        <header class="mb-8 flex items-center justify-between">
          <div>
            <h1 class="text-4xl font-bold tracking-tight">MINTZA</h1>
            <p class="mt-1 text-sm text-ink-400">From talk to insight.</p>
          </div>
          <nav class="flex gap-2 text-sm">
            <a href="#/history" class="btn-ghost">History</a>
            <a href="#/settings" class="btn-ghost">Settings</a>
          </nav>
        </header>

        <section class="card mb-6">
          <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div class="flex flex-col gap-3 md:flex-row md:items-end md:gap-6">
              ${templateRadios(cfg.defaultTemplate)}
              ${languageSelect(cfg.language)}
            </div>
            <div class="flex gap-2">
              <button id="btn-start" class="btn-primary">Record</button>
              <button id="btn-stop" class="btn-ghost" disabled>Stop</button>
            </div>
          </div>
          <p id="status" class="mt-3 text-sm text-ink-400">Ready to record.</p>
        </section>

        <section class="card mb-6">
          <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-400">Transcript</h3>
          <div id="transcription" class="min-h-[120px] whitespace-pre-wrap text-ink-600">
            <em class="text-ink-400">The transcript will appear here while you talk.</em>
          </div>
        </section>

        <section class="card">
          <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-400">Summary</h3>
          <div id="summaries" class="text-ink-600">
            <em class="text-ink-400">Summaries are generated when you stop recording.</em>
          </div>
        </section>
      </main>
    `;

    this.bind();
  }

  dispose(): void {
    this.unsubChunks?.();
    this.unsubChunks = null;
  }

  private bind(): void {
    const startBtn = this.qs<HTMLButtonElement>('#btn-start');
    const stopBtn = this.qs<HTMLButtonElement>('#btn-stop');
    startBtn.addEventListener('click', () => void this.handleStart());
    stopBtn.addEventListener('click', () => void this.handleStop());
  }

  private async handleStart(): Promise<void> {
    if (!this.deps.config.openAIKey()) {
      this.setStatus('Configure your OpenAI key before recording.');
      Router.navigate('/settings');
      return;
    }
    this.setStatus('Requesting microphone permission…');
    const result = await this.deps.startRecording.execute({
      template: Template.of(this.readTemplate()),
      language: Language.of(this.readLanguage()),
    });
    if (!result.ok) {
      this.setStatus(result.error.message);
      return;
    }
    this.meeting = result.value.meeting;
    this.setStatus('Recording…');
    this.toggleButtons(true);
    this.qs<HTMLElement>('#transcription').innerHTML = '';
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
    this.setStatus('Stopping…');
    this.unsubChunks?.();
    this.unsubChunks = null;
    await this.deps.stopRecording.execute({ meeting: this.meeting });
    this.setStatus('Generating summaries…');
    const summariesEl = this.qs<HTMLElement>('#summaries');
    summariesEl.innerHTML = '<em class="text-ink-400">Working…</em>';
    const result = await this.deps.generateSummaries.execute({
      meeting: this.meeting,
      kinds: SUMMARY_KINDS,
    });
    this.renderSummaries(summariesEl);
    await this.deps.saveMeeting.execute({ meeting: this.meeting });
    this.setStatus(`Done. Summaries: ${result.successCount} ok, ${result.failureCount} failed.`);
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
      target.innerHTML = '<em class="text-ink-400">No summaries were generated.</em>';
      return;
    }
    const order = this.meeting.template.featuredSummaryOrder();
    target.innerHTML = order
      .map((kind) => {
        const summary = summaries.get(kind);
        if (!summary) return '';
        return `<article class="mb-4">
            <h4 class="text-sm font-semibold uppercase tracking-wide text-ink-400">${labelFor(kind)}</h4>
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

const templateRadios = (current: TemplateKind): string => `
  <fieldset>
    <legend class="block text-xs font-semibold uppercase tracking-wide text-ink-400 mb-1">Template</legend>
    <div class="flex gap-3 text-sm">
      ${templateRadio('generic', 'Generic', current)}
      ${templateRadio('work', 'Work', current)}
      ${templateRadio('interview', 'Interview', current)}
    </div>
  </fieldset>
`;

const templateRadio = (value: TemplateKind, label: string, current: TemplateKind): string => `
  <label class="inline-flex items-center gap-1.5 cursor-pointer">
    <input type="radio" name="template" value="${value}" ${value === current ? 'checked' : ''} />
    <span>${label}</span>
  </label>
`;

const languageSelect = (current: LanguageCode): string => `
  <label class="block">
    <span class="block text-xs font-semibold uppercase tracking-wide text-ink-400 mb-1">Spoken language</span>
    <select id="lang-select" class="rounded-lg border border-ink-100 px-2 py-1 text-sm">
      <option value="en" ${current === 'en' ? 'selected' : ''}>English</option>
      <option value="es" ${current === 'es' ? 'selected' : ''}>Spanish</option>
      <option value="eu" ${current === 'eu' ? 'selected' : ''}>Basque</option>
    </select>
  </label>
`;

const SUMMARY_LABELS: Record<SummaryKind, string> = {
  bullet_points: 'Key points',
  action_items: 'Action items',
  one_liner: 'One-liner',
  keywords: 'Keywords',
  sentiment: 'Sentiment',
  timeline: 'Timeline',
  decisions: 'Decisions',
  next_steps: 'Next steps',
};

const labelFor = (kind: SummaryKind): string => SUMMARY_LABELS[kind];

const escapeHtml = (raw: string): string =>
  raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
