import { afterEach, describe, expect, it } from 'vitest';
import { FinalizeMeetingUseCase } from '../../src/application/use-cases/FinalizeMeetingUseCase';
import { GenerateMindMapUseCase } from '../../src/application/use-cases/GenerateMindMapUseCase';
import { GenerateSummariesUseCase } from '../../src/application/use-cases/GenerateSummariesUseCase';
import { ListMeetingsUseCase } from '../../src/application/use-cases/ListMeetingsUseCase';
import { ListTemplatesUseCase } from '../../src/application/use-cases/ListTemplatesUseCase';
import { SaveMeetingUseCase } from '../../src/application/use-cases/SaveMeetingUseCase';
import { StartRecordingUseCase } from '../../src/application/use-cases/StartRecordingUseCase';
import { StopRecordingUseCase } from '../../src/application/use-cases/StopRecordingUseCase';
import { TranscribeChunkUseCase } from '../../src/application/use-cases/TranscribeChunkUseCase';
import type {
  AudioCapturePort,
  AudioChunkHandler,
  RecordingState,
  Unsubscribe,
} from '../../src/domain/audio/ports/AudioCapturePort';
import { AudioChunk } from '../../src/domain/audio/value-objects/AudioChunk';
import {
  DEFAULT_CONFIG,
  type AppConfig,
  type ConfigRepository,
} from '../../src/domain/meeting/ports/ConfigRepository';
import { TemplateRegistry } from '../../src/domain/meeting/services/TemplateRegistry';
import type { SummarizationPort } from '../../src/domain/summary/ports/SummarizationPort';
import type { ScreenWakePort } from '../../src/domain/system/ports/ScreenWakePort';
import { SentimentScoreParser } from '../../src/domain/temperature/services/SentimentScoreParser';
import { LocalStorageTemplateRepository } from '../../src/infrastructure/persistence/LocalStorageTemplateRepository';
import { HomePage } from '../../src/presentation/pages/HomePage';
import { ConfigStore } from '../../src/presentation/state/ConfigStore';
import type { AppError } from '../../src/shared/errors/AppError';
import { ok, type Result } from '../../src/shared/result/Result';
import { FakeMindMapPort } from '../fakes/FakeMindMapPort';
import { FakeSummarizationPort } from '../fakes/FakeSummarizationPort';
import { FakeTranscriptionPort } from '../fakes/FakeTranscriptionPort';
import { InMemoryMeetingRepository } from '../fakes/InMemoryMeetingRepository';

class ConfigRepo implements ConfigRepository {
  constructor(private readonly config: AppConfig) {}
  load(): Promise<Result<AppConfig, AppError>> {
    return Promise.resolve(ok(this.config));
  }
  save(): Promise<Result<void, AppError>> {
    return Promise.resolve(ok(undefined));
  }
  clear(): Promise<Result<void, AppError>> {
    return Promise.resolve(ok(undefined));
  }
}

class FakeAudio implements AudioCapturePort {
  private status: RecordingState = 'idle';
  private readonly handlers = new Set<AudioChunkHandler>();
  start(): Promise<void> {
    this.status = 'recording';
    return Promise.resolve();
  }
  pause(): Promise<void> {
    this.status = 'paused';
    return Promise.resolve();
  }
  resume(): Promise<void> {
    this.status = 'recording';
    return Promise.resolve();
  }
  stop(): Promise<void> {
    this.status = 'stopped';
    return Promise.resolve();
  }
  state(): RecordingState {
    return this.status;
  }
  getStream(): MediaStream | null {
    return null;
  }
  onChunk(handler: AudioChunkHandler): Unsubscribe {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
  emit(chunk: AudioChunk): void {
    this.handlers.forEach((h) => h(chunk));
  }
}

class NoScreenWake implements ScreenWakePort {
  request(): Promise<void> {
    return Promise.resolve();
  }
  release(): Promise<void> {
    return Promise.resolve();
  }
  isActive(): boolean {
    return false;
  }
  isSupported(): boolean {
    return false;
  }
}

const settle = async (): Promise<void> => {
  for (let i = 0; i < 10; i++) await new Promise((resolve) => setTimeout(resolve, 0));
};

const pages: HomePage[] = [];

const mount = async (
  openai: string | undefined,
  summarization: SummarizationPort = new FakeSummarizationPort({ kind: 'success', content: 'ok' }),
  storedTemplates: object[] = [],
): Promise<{ root: HTMLElement; audio: FakeAudio }> => {
  window.localStorage.clear();
  if (storedTemplates.length > 0) {
    window.localStorage.setItem('mintza:templates:v1', JSON.stringify(storedTemplates));
  }
  const config = new ConfigStore(
    new ConfigRepo({ ...DEFAULT_CONFIG, apiKeys: openai ? { openai } : {} }),
  );
  await config.hydrate();
  const audio = new FakeAudio();
  const meetings = new InMemoryMeetingRepository();
  const mindMap = new FakeMindMapPort({ kind: 'success', rootLabel: 'topic' });
  const registry = new TemplateRegistry(new LocalStorageTemplateRepository(window.localStorage));
  const page = new HomePage({
    config,
    audio,
    screenWake: new NoScreenWake(),
    startRecording: new StartRecordingUseCase(audio),
    stopRecording: new StopRecordingUseCase(audio),
    transcribeChunk: new TranscribeChunkUseCase(
      new FakeTranscriptionPort({ kind: 'success', text: 'hello team', provider: 'whisper' }),
    ),
    generateSummaries: new GenerateSummariesUseCase(summarization),
    generateMindMap: new GenerateMindMapUseCase(mindMap),
    finalizeMeeting: new FinalizeMeetingUseCase(
      summarization,
      mindMap,
      meetings,
      new SentimentScoreParser(),
    ),
    saveMeeting: new SaveMeetingUseCase(meetings),
    listTemplates: new ListTemplatesUseCase(registry),
    listMeetings: new ListMeetingsUseCase(meetings),
    templateRegistry: registry,
    shell: { setBusy: () => undefined },
  });
  pages.push(page);
  const root = document.createElement('div');
  document.body.appendChild(root);
  await page.render(root);
  return { root, audio };
};

const recordAndStop = async (root: HTMLElement, audio: FakeAudio): Promise<void> => {
  root.querySelector<HTMLButtonElement>('#btn-record')!.click();
  await settle();
  audio.emit(
    new AudioChunk({ blob: new Blob(['a']), startMs: 0, endMs: 1000, mimeType: 'audio/webm' }),
  );
  await settle();
  root.querySelector<HTMLButtonElement>('#btn-stop')!.click();
  await settle();
};

const viewport = (width: number, height: number): void => {
  (window as unknown as { happyDOM: { setViewport(v: object): void } }).happyDOM.setViewport({
    width,
    height,
  });
  window.dispatchEvent(new Event('resize'));
};

const docked = (root: HTMLElement): boolean =>
  root.querySelector('#home-wrap')!.hasAttribute('data-docked');

const focusOrder = (root: HTMLElement): Element[] =>
  [...root.querySelectorAll<HTMLElement>('a[href], button, select, input, textarea')].filter(
    (el) => el.closest('[hidden], .hidden') === null,
  );

const visible = (root: HTMLElement, selector: string): boolean => {
  const el = root.querySelector<HTMLElement>(selector);
  return el !== null && !el.hidden && el.closest('[hidden]') === null;
};

describe('HomePage states', () => {
  afterEach(() => {
    pages.splice(0).forEach((page) => page.dispose());
    document.body.innerHTML = '';
    viewport(1024, 768);
  });

  it('asks to connect OpenAI instead of offering a Record button that cannot work', async () => {
    const { root } = await mount(undefined);

    expect(root.querySelector('#connect h2')!.textContent).toBe('Connect OpenAI to start');
    expect(root.querySelector('#connect a[href="#/settings"]')).not.toBeNull();
    expect(root.querySelector('#connect')!.textContent).toMatch(/About \$0\.\d\d per hour/);
    expect(root.querySelector('#btn-record')).toBeNull();
    expect(root.querySelectorAll('button[disabled]')).toHaveLength(0);
  });

  it('offers an enabled Record button once a key is set', async () => {
    const { root } = await mount('sk-test');

    const record = root.querySelector<HTMLButtonElement>('#btn-record')!;
    expect(record.disabled).toBe(false);
    expect(visible(root, '#btn-record')).toBe(true);
    expect(root.querySelector('#connect')).toBeNull();
    expect(root.querySelector('[data-template="generic"]')!.getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('docks Record outside the morphing card on a portrait phone, right after the language', async () => {
    viewport(390, 844);
    const { root } = await mount('sk-test');

    const dock = root.querySelector<HTMLElement>('#record-dock')!;
    expect(dock.contains(root.querySelector('#btn-record'))).toBe(true);
    expect(dock.closest('.rec-card')).toBeNull();
    expect(dock.previousElementSibling).toBe(root.querySelector('#rec-card'));
    expect(visible(root, '#record-dock')).toBe(true);
    expect(docked(root)).toBe(true);
    const order = focusOrder(root);
    expect(order[order.indexOf(root.querySelector('#panel-idle select')!) + 1]).toBe(
      root.querySelector('#btn-record'),
    );
  });

  it('docks Record only while idle', async () => {
    viewport(390, 844);
    const { root, audio } = await mount('sk-test');

    root.querySelector<HTMLButtonElement>('#btn-record')!.click();
    await settle();
    expect(visible(root, '#record-dock')).toBe(false);
    expect(docked(root)).toBe(false);

    audio.emit(
      new AudioChunk({ blob: new Blob(['a']), startMs: 0, endMs: 1000, mimeType: 'audio/webm' }),
    );
    await settle();
    root.querySelector<HTMLButtonElement>('#btn-stop')!.click();
    await settle();
    expect(visible(root, '#panel-done')).toBe(true);
    expect(visible(root, '#record-dock')).toBe(false);
    expect(docked(root)).toBe(false);

    root.querySelector<HTMLButtonElement>('#btn-new')!.click();
    await settle();
    expect(visible(root, '#record-dock')).toBe(true);
    expect(docked(root)).toBe(true);
    expect(root.querySelector('#record-dock')!.closest('.rec-card')).toBeNull();
  });

  it.each([
    ['a short landscape phone', 740, 360],
    ['a wide screen', 1280, 800],
  ])('keeps Record inline in its card on %s', async (_, width, height) => {
    viewport(width, height);
    const { root } = await mount('sk-test');

    const dock = root.querySelector<HTMLElement>('#record-dock')!;
    expect(dock.closest('#panel-idle')).not.toBeNull();
    expect(visible(root, '#record-dock')).toBe(true);
    expect(docked(root)).toBe(false);
    const order = focusOrder(root);
    expect(order[order.indexOf(root.querySelector('#panel-idle select')!) + 1]).toBe(
      root.querySelector('#btn-record'),
    );
  });

  it('moves Record in and out of the card when the phone turns, keeping focus on it', async () => {
    viewport(390, 844);
    const { root } = await mount('sk-test');
    // happy-dom only fires `change` after a resize it saw match, and it assumes "no match" at first.
    viewport(390, 844);
    const record = root.querySelector<HTMLButtonElement>('#btn-record')!;
    record.focus();

    viewport(740, 360);
    expect(record.closest('#panel-idle')).not.toBeNull();
    expect(docked(root)).toBe(false);
    expect(document.activeElement).toBe(record);

    viewport(390, 844);
    expect(record.closest('.rec-card')).toBeNull();
    expect(docked(root)).toBe(true);
    expect(document.activeElement).toBe(record);
  });

  it('docks nothing while OpenAI is not connected', async () => {
    const { root } = await mount(undefined);

    expect(root.querySelector('#record-dock')).toBeNull();
    expect(root.querySelector('#home-wrap')!.hasAttribute('data-docked')).toBe(false);
  });

  it('leads with the chosen template’s main result and folds the rest away', async () => {
    const { root, audio } = await mount('sk-test');
    root.querySelector<HTMLButtonElement>('[data-template="work"]')!.click();

    await recordAndStop(root, audio);

    expect(visible(root, '#panel-done')).toBe(true);
    expect(root.querySelector('#primary-summary h3')!.textContent).toBe('Decisions');
    const rest = [...root.querySelectorAll('#rest-summaries details h3')].map((h) => h.textContent);
    expect(rest).toHaveLength(7);
    expect(rest).not.toContain('Decisions');
    expect(root.querySelector('#rest-summaries details[open]')).toBeNull();
    expect(root.querySelector('#status')!.textContent).toContain('Saved to History');
  });

  it('leaves sentiment to the gauge instead of repeating it as a text row', async () => {
    const { root, audio } = await mount(
      'sk-test',
      new FakeSummarizationPort({ kind: 'success', content: 'Calm and upbeat. Score: 0.6' }),
    );

    await recordAndStop(root, audio);

    expect(visible(root, '#temperature-card')).toBe(true);
    const labels = [...root.querySelectorAll('#primary-summary h3, #rest-summaries h3')].map(
      (h) => h.textContent,
    );
    expect(labels).toHaveLength(7);
    expect(labels).not.toContain('Sentiment');
  });

  it('asks the summarizer only for the kinds of the chosen template', async () => {
    const summarization = new FakeSummarizationPort({ kind: 'success', content: 'ok' });
    const { root, audio } = await mount('sk-test', summarization, [
      {
        id: 'custom-1',
        name: 'Slim',
        systemRole: 'You summarise.',
        mindMapStructure: 'topics',
        summaryKinds: ['decisions', 'action_items', 'next_steps'],
        featuredOrder: ['decisions'],
        kindLabels: {},
        promptOverrides: {},
      },
    ]);
    root.querySelector<HTMLButtonElement>('[data-template="custom-1"]')!.click();

    await recordAndStop(root, audio);

    expect(summarization.requestedKinds().sort()).toEqual([
      'action_items',
      'decisions',
      'next_steps',
    ]);
    expect(root.querySelector('#temperature-card')!.classList.contains('hidden')).toBe(true);
    const labels = [...root.querySelectorAll('#primary-summary h3, #rest-summaries h3')];
    expect(labels).toHaveLength(3);
  });

  it('keeps every failed result marked with its reason', async () => {
    const { root, audio } = await mount(
      'sk-test',
      new FakeSummarizationPort({ kind: 'failure', code: 'API_KEY_INVALID', message: 'bad key' }),
    );

    await recordAndStop(root, audio);

    expect(visible(root, '#failed-steps')).toBe(true);
    const rows = [...root.querySelectorAll('#failed-steps [data-step]')];
    expect(rows).toHaveLength(8);
    rows.forEach((row) => {
      expect(row.querySelector('[data-step-state]')!.textContent).toBe('Failed');
      expect(row.querySelector('[data-step-error]')!.textContent).toBe('bad key');
    });
  });
});
