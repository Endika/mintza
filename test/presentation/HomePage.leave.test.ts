import { afterEach, describe, expect, it } from 'vitest';
import { FinalizeMeetingUseCase } from '../../src/application/use-cases/FinalizeMeetingUseCase';
import { GenerateMindMapUseCase } from '../../src/application/use-cases/GenerateMindMapUseCase';
import { GenerateSummariesUseCase } from '../../src/application/use-cases/GenerateSummariesUseCase';
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
import { ok, type Result } from '../../src/shared/result/Result';
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

const settle = async (): Promise<void> => {
  for (let i = 0; i < 10; i++) await new Promise((resolve) => setTimeout(resolve, 0));
};

const chunk = (): AudioChunk =>
  new AudioChunk({ blob: new Blob(['a']), startMs: 0, endMs: 1000, mimeType: 'audio/webm' });

interface Harness {
  readonly page: HomePage;
  readonly root: HTMLElement;
  readonly audio: FakeAudio;
  readonly meetings: InMemoryMeetingRepository;
}

const setup = async (transcription: TranscriptionPort): Promise<Harness> => {
  window.localStorage.clear();
  const config = new ConfigStore(new KeyedConfigRepo());
  await config.hydrate();
  const audio = new FakeAudio();
  const meetings = new InMemoryMeetingRepository();
  const summarization = new FakeSummarizationPort({ kind: 'success', content: 'ok' });
  const mindMap = new FakeMindMapPort({ kind: 'success', rootLabel: 'topic' });
  const registry = new TemplateRegistry(new LocalStorageTemplateRepository(window.localStorage));
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
    templateRegistry: registry,
  });
  const root = document.createElement('div');
  document.body.appendChild(root);
  await page.render(root);
  root.querySelector<HTMLButtonElement>('#btn-record')!.click();
  await settle();
  return { page, root, audio, meetings };
};

const originalConfirm = Object.getOwnPropertyDescriptor(window, 'confirm');

describe('HomePage leaving a recording', () => {
  afterEach(() => {
    if (originalConfirm) Object.defineProperty(window, 'confirm', originalConfirm);
    else Reflect.deleteProperty(window, 'confirm');
    document.body.innerHTML = '';
  });

  it('stays on the page with the error shown when the transcript fails to save', async () => {
    const { page, root, audio, meetings } = await setup(
      new FakeTranscriptionPort({ kind: 'success', text: 'hello team', provider: 'whisper' }),
    );
    audio.emit(chunk());
    await settle();
    meetings.failNextSave(new AppError('STORAGE_FAILED', 'quota exceeded'));
    window.confirm = () => true;

    const left = await page.canLeave();

    expect(left).toBe(false);
    expect(root.querySelector('#status')!.textContent).toContain('quota exceeded');
    expect(meetings.saves).toHaveLength(0);
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
});
