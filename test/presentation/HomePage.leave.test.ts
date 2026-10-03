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
import type { ScreenWakePort } from '../../src/domain/system/ports/ScreenWakePort';
import { SentimentScoreParser } from '../../src/domain/temperature/services/SentimentScoreParser';
import type { TranscriptSegment } from '../../src/domain/transcription/entities/TranscriptSegment';
import type {
  TranscriptionPort,
  TranscriptionRequest,
} from '../../src/domain/transcription/ports/TranscriptionPort';
import { LocalStorageTemplateRepository } from '../../src/infrastructure/persistence/LocalStorageTemplateRepository';
import { HomePage } from '../../src/presentation/pages/HomePage';
import { ConfigStore } from '../../src/presentation/state/ConfigStore';
import { AppError } from '../../src/shared/errors/AppError';
import { err, ok, type Result } from '../../src/shared/result/Result';
import { FakeMindMapPort } from '../fakes/FakeMindMapPort';
import { FakeSummarizationPort } from '../fakes/FakeSummarizationPort';
import { FakeTranscriptionPort } from '../fakes/FakeTranscriptionPort';
import { InMemoryMeetingRepository } from '../fakes/InMemoryMeetingRepository';

class KeyedConfigRepo implements ConfigRepository {
  load(): Promise<Result<AppConfig, AppError>> {
    return Promise.resolve(ok({ ...DEFAULT_CONFIG, apiKeys: { openai: 'sk-test' } }));
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

class GatedTranscription implements TranscriptionPort {
  private open: () => void = () => undefined;
  private readonly gate = new Promise<void>((resolve) => (this.open = resolve));
  constructor(private readonly inner: TranscriptionPort) {}
  release(): void {
    this.open();
  }
  async transcribe(request: TranscriptionRequest): Promise<Result<TranscriptSegment, AppError>> {
    await this.gate;
    return this.inner.transcribe(request);
  }
}

const unload = (): Event => {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event;
};

const settle = async (): Promise<void> => {
  for (let i = 0; i < 10; i++) await new Promise((resolve) => setTimeout(resolve, 0));
};

const chunk = (): AudioChunk =>
  new AudioChunk({ blob: new Blob(['a']), startMs: 0, endMs: 1000, mimeType: 'audio/webm' });

class FakeShell {
  busy = false;
  setBusy(busy: boolean): void {
    this.busy = busy;
  }
}

interface Harness {
  readonly page: HomePage;
  readonly shell: FakeShell;
  readonly root: HTMLElement;
  readonly audio: FakeAudio;
  readonly meetings: InMemoryMeetingRepository;
}

class BrokenMeetingRepository extends InMemoryMeetingRepository {
  constructor(private readonly mode: 'fail' | 'throw') {
    super();
  }
  attempts = 0;
  override save(): Promise<Result<void, AppError>> {
    this.attempts += 1;
    if (this.mode === 'throw') return Promise.reject(new Error('disk exploded'));
    return Promise.resolve(err(new AppError('STORAGE_FAILED', 'quota exceeded')));
  }
}

const pages: HomePage[] = [];

const setup = async (
  transcription: TranscriptionPort,
  meetings: InMemoryMeetingRepository = new InMemoryMeetingRepository(),
): Promise<Harness> => {
  window.localStorage.clear();
  const config = new ConfigStore(new KeyedConfigRepo());
  await config.hydrate();
  const audio = new FakeAudio();
  const summarization = new FakeSummarizationPort({ kind: 'success', content: 'ok' });
  const mindMap = new FakeMindMapPort({ kind: 'success', rootLabel: 'topic' });
  const registry = new TemplateRegistry(new LocalStorageTemplateRepository(window.localStorage));
  const shell = new FakeShell();
  const page = new HomePage({
    config,
    audio,
    screenWake: new NoScreenWake(),
    startRecording: new StartRecordingUseCase(audio),
    stopRecording: new StopRecordingUseCase(audio),
    transcribeChunk: new TranscribeChunkUseCase(transcription),
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
    shell,
  });
  pages.push(page);
  const root = document.createElement('div');
  document.body.appendChild(root);
  await page.render(root);
  root.querySelector<HTMLButtonElement>('#btn-record')!.click();
  await settle();
  return { page, shell, root, audio, meetings };
};

const originalConfirm = Object.getOwnPropertyDescriptor(window, 'confirm');

describe('HomePage leaving a recording', () => {
  afterEach(() => {
    if (originalConfirm) Object.defineProperty(window, 'confirm', originalConfirm);
    else Reflect.deleteProperty(window, 'confirm');
    pages.splice(0).forEach((page) => page.dispose());
    document.body.innerHTML = '';
  });

  it('stays on the page with the error shown when the transcript fails to save', async () => {
    const meetings = new BrokenMeetingRepository('fail');
    const { page, root, audio } = await setup(
      new FakeTranscriptionPort({ kind: 'success', text: 'hello team', provider: 'whisper' }),
      meetings,
    );
    audio.emit(chunk());
    await settle();
    window.confirm = () => true;

    const left = await page.canLeave();
    await settle();

    expect(left).toBe(false);
    expect(meetings.attempts).toBe(2);
    expect(root.querySelector('#status')!.textContent).toContain('quota exceeded');
  });

  it('lets the page go during processing only once the transcript is in the repository', async () => {
    const transcription = new GatedTranscription(
      new FakeTranscriptionPort({ kind: 'success', text: 'hello team', provider: 'whisper' }),
    );
    const { page, root, audio, meetings } = await setup(transcription);
    audio.emit(chunk());
    root.querySelector<HTMLButtonElement>('#btn-stop')!.click();
    await settle();
    window.confirm = () => true;

    let left: boolean | undefined;
    void page.canLeave().then((value) => (left = value));
    await settle();
    expect(left).toBeUndefined();
    expect(meetings.saves).toHaveLength(0);

    transcription.release();
    await settle();

    expect(left).toBe(true);
    const listed = await meetings.list();
    expect(listed.ok && listed.value).toHaveLength(1);
    expect(meetings.saves[0]!.fullText().value).toContain('hello team');
  });

  it('asks before leaving a finished meeting that no save could store', async () => {
    const { page, shell, root, audio } = await setup(
      new FakeTranscriptionPort({ kind: 'success', text: 'hello team', provider: 'whisper' }),
      new BrokenMeetingRepository('fail'),
    );
    audio.emit(chunk());
    await settle();
    expect(shell.busy).toBe(true);
    root.querySelector<HTMLButtonElement>('#btn-stop')!.click();
    await settle();
    expect(root.querySelector('#btn-new')!.classList.contains('hidden')).toBe(false);
    expect(unload().defaultPrevented).toBe(true);
    expect(shell.busy).toBe(false);

    const asked: string[] = [];
    let answer = false;
    window.confirm = (message?: string) => {
      asked.push(message ?? '');
      return answer;
    };

    expect(await page.canLeave()).toBe(false);
    expect(asked).toEqual(["This meeting isn't saved. Leave and lose it?"]);
    answer = true;
    expect(await page.canLeave()).toBe(true);
  });

  it('leaves processing and asks instead of trapping the user when stopping throws', async () => {
    const { page, root, audio } = await setup(
      new FakeTranscriptionPort({ kind: 'success', text: 'hello team', provider: 'whisper' }),
      new BrokenMeetingRepository('throw'),
    );
    audio.emit(chunk());
    await settle();
    const asked: string[] = [];
    window.confirm = (message?: string) => {
      asked.push(message ?? '');
      return true;
    };

    expect(await page.canLeave()).toBe(false);
    await settle();
    expect(root.querySelector('#status')!.textContent).toContain('disk exploded');
    expect(root.querySelector('#btn-new')!.classList.contains('hidden')).toBe(false);

    expect(await page.canLeave()).toBe(true);
    expect(asked).toEqual([
      'Stop and save this recording before leaving?',
      "This meeting isn't saved. Leave and lose it?",
    ]);
  });

  it('asks before starting over on a meeting that no save could store', async () => {
    const { root, audio } = await setup(
      new FakeTranscriptionPort({ kind: 'success', text: 'hello team', provider: 'whisper' }),
      new BrokenMeetingRepository('fail'),
    );
    audio.emit(chunk());
    await settle();
    root.querySelector<HTMLButtonElement>('#btn-stop')!.click();
    await settle();
    const asked: string[] = [];
    let answer = false;
    window.confirm = (message?: string) => {
      asked.push(message ?? '');
      return answer;
    };

    root.querySelector<HTMLButtonElement>('#btn-new')!.click();
    await settle();
    expect(asked).toEqual(["This meeting isn't saved. Leave and lose it?"]);
    expect(root.querySelector('#status')!.textContent).toContain('quota exceeded');
    expect(root.querySelector('#transcription')!.textContent).toContain('hello team');

    answer = true;
    root.querySelector<HTMLButtonElement>('#btn-new')!.click();
    await settle();
    expect(root.querySelector('#transcription')!.textContent).not.toContain('hello team');
    expect(root.querySelector('#btn-record')!.hasAttribute('disabled')).toBe(false);
    expect(unload().defaultPrevented).toBe(false);
  });
});
