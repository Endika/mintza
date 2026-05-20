import type { StartRecordingUseCase } from '../../application/use-cases/StartRecordingUseCase';
import type { StopRecordingUseCase } from '../../application/use-cases/StopRecordingUseCase';
import type { TranscribeChunkUseCase } from '../../application/use-cases/TranscribeChunkUseCase';
import type { GenerateSummariesUseCase } from '../../application/use-cases/GenerateSummariesUseCase';
import type { SaveMeetingUseCase } from '../../application/use-cases/SaveMeetingUseCase';
import type { AudioCapturePort } from '../../domain/audio/ports/AudioCapturePort';
import type { AudioChunk } from '../../domain/audio/value-objects/AudioChunk';
import { Language } from '../../domain/language/value-objects/Language';
import type { Meeting } from '../../domain/meeting/entities/Meeting';
import { Template } from '../../domain/meeting/value-objects/Template';
import type { SummaryKind } from '../../domain/summary/value-objects/SummaryKind';
import type { TranscriptSegment } from '../../domain/transcription/entities/TranscriptSegment';
import type { ConfigStore } from '../state/ConfigStore';
import { Router, type Page } from '../router/Router';

const PHASE_1_KINDS: readonly SummaryKind[] = ['bullet_points', 'action_items', 'one_liner'];

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
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold">New meeting</h2>
              <p id="status" class="mt-1 text-sm text-ink-400">Ready to record.</p>
            </div>
            <div class="flex gap-2">
              <button id="btn-start" class="btn-primary">Record</button>
              <button id="btn-stop" class="btn-ghost" disabled>Stop</button>
            </div>
          </div>
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
      template: Template.generic(),
      language: Language.default(),
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
      kinds: PHASE_1_KINDS,
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
    const items = Array.from(this.meeting.summaries.values());
    if (items.length === 0) {
      target.innerHTML = '<em class="text-ink-400">No summaries were generated.</em>';
      return;
    }
    target.innerHTML = items
      .map(
        (s) =>
          `<article class="mb-4">
            <h4 class="text-sm font-semibold uppercase tracking-wide text-ink-400">${labelFor(s.kind)}</h4>
            <p class="mt-1 whitespace-pre-wrap">${escapeHtml(s.content)}</p>
          </article>`,
      )
      .join('');
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

const labelFor = (kind: SummaryKind): string => {
  switch (kind) {
    case 'bullet_points':
      return 'Key points';
    case 'action_items':
      return 'Action items';
    case 'one_liner':
      return 'One-liner';
    default:
      return kind;
  }
};

const escapeHtml = (raw: string): string =>
  raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
