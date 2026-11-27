import { ClearMeetingsUseCase } from '../application/use-cases/ClearMeetingsUseCase';
import { DeleteMeetingUseCase } from '../application/use-cases/DeleteMeetingUseCase';
import { DeleteTemplateUseCase } from '../application/use-cases/DeleteTemplateUseCase';
import { FinalizeMeetingUseCase } from '../application/use-cases/FinalizeMeetingUseCase';
import { GenerateMindMapUseCase } from '../application/use-cases/GenerateMindMapUseCase';
import { GenerateSummariesUseCase } from '../application/use-cases/GenerateSummariesUseCase';
import { GetConfigUseCase } from '../application/use-cases/GetConfigUseCase';
import { GetMeetingUseCase } from '../application/use-cases/GetMeetingUseCase';
import { ListMeetingsUseCase } from '../application/use-cases/ListMeetingsUseCase';
import { ListTemplatesUseCase } from '../application/use-cases/ListTemplatesUseCase';
import { RegenerateSummariesUseCase } from '../application/use-cases/RegenerateSummariesUseCase';
import { SaveMeetingUseCase } from '../application/use-cases/SaveMeetingUseCase';
import { ExportTemplateUseCase } from '../application/use-cases/ExportTemplateUseCase';
import { ImportMeetingUseCase } from '../application/use-cases/ImportMeetingUseCase';
import { ImportTemplatesUseCase } from '../application/use-cases/ImportTemplatesUseCase';
import { SaveTemplateUseCase } from '../application/use-cases/SaveTemplateUseCase';
import { StartRecordingUseCase } from '../application/use-cases/StartRecordingUseCase';
import { StopRecordingUseCase } from '../application/use-cases/StopRecordingUseCase';
import { TranscribeChunkUseCase } from '../application/use-cases/TranscribeChunkUseCase';
import { UpdateConfigUseCase } from '../application/use-cases/UpdateConfigUseCase';
import { ValidateApiKeyUseCase } from '../application/use-cases/ValidateApiKeyUseCase';
import { TemplateRegistry } from '../domain/meeting/services/TemplateRegistry';
import { SentimentScoreParser } from '../domain/temperature/services/SentimentScoreParser';
import { HttpApiKeyValidator } from '../infrastructure/api/HttpApiKeyValidator';
import { MediaRecorderAdapter } from '../infrastructure/audio/MediaRecorderAdapter';
import { HttpClient } from '../infrastructure/http/HttpClient';
import { ClaudeClient } from '../infrastructure/llm/ClaudeClient';
import { ClaudeSummarizationAdapter } from '../infrastructure/llm/ClaudeSummarizationAdapter';
import { GeminiClient } from '../infrastructure/llm/GeminiClient';
import { GeminiSummarizationAdapter } from '../infrastructure/llm/GeminiSummarizationAdapter';
import { LLMMindMapAdapter } from '../infrastructure/llm/LLMMindMapAdapter';
import { OpenAIClient } from '../infrastructure/llm/OpenAIClient';
import { OpenAISummarizationAdapter } from '../infrastructure/llm/OpenAISummarizationAdapter';
import {
  SummarizationChainAdapter,
  type NamedSummarizationPort,
} from '../infrastructure/llm/SummarizationChainAdapter';
import { IndexedDBMeetingRepository } from '../infrastructure/persistence/IndexedDBMeetingRepository';
import { LocalStorageConfigRepository } from '../infrastructure/persistence/LocalStorageConfigRepository';
import { LocalStorageTemplateRepository } from '../infrastructure/persistence/LocalStorageTemplateRepository';
import { AzureSpeechClient } from '../infrastructure/transcription/AzureSpeechClient';
import { AzureSpeechTranscriptionAdapter } from '../infrastructure/transcription/AzureSpeechTranscriptionAdapter';
import { GoogleSpeechClient } from '../infrastructure/transcription/GoogleSpeechClient';
import { GoogleSpeechTranscriptionAdapter } from '../infrastructure/transcription/GoogleSpeechTranscriptionAdapter';
import {
  TranscriptionChainAdapter,
  type NamedTranscriptionPort,
} from '../infrastructure/transcription/TranscriptionChainAdapter';
import { OpenAITranscriptionAdapter } from '../infrastructure/transcription/OpenAITranscriptionAdapter';
import { OpenAITranscriptionClient } from '../infrastructure/transcription/OpenAITranscriptionClient';
import { WakeLockAdapter } from '../infrastructure/system/WakeLockAdapter';
import type { ScreenWakePort } from '../domain/system/ports/ScreenWakePort';
import { ConfigStore } from '../presentation/state/ConfigStore';
import {
  SUMMARY_CHAINS,
  TRANSCRIPTION_CHAINS,
  type SummaryStep,
  type TranscriptionStep,
} from '../domain/meeting/services/ProviderChains';

export interface AppDeps {
  readonly configStore: ConfigStore;
  readonly audio: MediaRecorderAdapter;
  readonly screenWake: ScreenWakePort;
  readonly startRecording: StartRecordingUseCase;
  readonly stopRecording: StopRecordingUseCase;
  readonly transcribeChunk: TranscribeChunkUseCase;
  readonly generateSummaries: GenerateSummariesUseCase;
  readonly generateMindMap: GenerateMindMapUseCase;
  readonly finalizeMeeting: FinalizeMeetingUseCase;
  readonly saveMeeting: SaveMeetingUseCase;
  readonly listMeetings: ListMeetingsUseCase;
  readonly deleteMeeting: DeleteMeetingUseCase;
  readonly clearMeetings: ClearMeetingsUseCase;
  readonly getMeeting: GetMeetingUseCase;
  readonly getConfig: GetConfigUseCase;
  readonly updateConfig: UpdateConfigUseCase;
  readonly validateApiKey: ValidateApiKeyUseCase;
  readonly listTemplates: ListTemplatesUseCase;
  readonly saveTemplate: SaveTemplateUseCase;
  readonly exportTemplate: ExportTemplateUseCase;
  readonly importTemplates: ImportTemplatesUseCase;
  readonly importMeeting: ImportMeetingUseCase;
  readonly deleteTemplate: DeleteTemplateUseCase;
  readonly regenerateSummaries: RegenerateSummariesUseCase;
  readonly templateRegistry: TemplateRegistry;
}

export const buildAppDeps = (): AppDeps => {
  const http = new HttpClient();
  const configRepo = new LocalStorageConfigRepository();
  const configStore = new ConfigStore(configRepo);
  const templateRepo = new LocalStorageTemplateRepository();
  const templateRegistry = new TemplateRegistry(templateRepo);
  const meetingRepo = new IndexedDBMeetingRepository(globalThis.indexedDB, (id) =>
    templateRegistry.resolveOrFallback(id),
  );

  const openAITranscription = new OpenAITranscriptionClient(http, () => configStore.openAIKey());
  const openAITranscriptionAdapter: NamedTranscriptionPort = {
    name: 'GPT Transcribe',
    port: new OpenAITranscriptionAdapter(openAITranscription),
  };
  const googleSpeech = new GoogleSpeechClient(http, () => configStore.googleSpeechKey());
  const googleSpeechAdapter: NamedTranscriptionPort = {
    name: 'Google Speech',
    port: new GoogleSpeechTranscriptionAdapter(googleSpeech),
  };
  const azureSpeech = new AzureSpeechClient(
    http,
    () => configStore.azureKey(),
    () => configStore.azureRegion(),
  );
  const azureSpeechAdapter: NamedTranscriptionPort = {
    name: 'Azure Speech',
    port: new AzureSpeechTranscriptionAdapter(azureSpeech),
  };

  const transcriptionAdapters: Record<TranscriptionStep, NamedTranscriptionPort> = {
    'gpt-transcribe': openAITranscriptionAdapter,
    google: googleSpeechAdapter,
    azure: azureSpeechAdapter,
  };
  const transcription = new TranscriptionChainAdapter(() =>
    TRANSCRIPTION_CHAINS[configStore.get().transcriptionQuality].map(
      (step) => transcriptionAdapters[step],
    ),
  );

  const openai = new OpenAIClient(http, () => configStore.openAIKey());
  const openaiAdapter: NamedSummarizationPort = {
    name: 'GPT-6 Luna',
    port: new OpenAISummarizationAdapter(openai),
  };
  const openaiPremiumAdapter: NamedSummarizationPort = {
    name: 'GPT-6 Luna (reasoning)',
    port: new OpenAISummarizationAdapter(openai, { reasoningEffort: 'low' }),
  };

  const claude = new ClaudeClient(http, () => configStore.anthropicKey());
  const claudeAdapter: NamedSummarizationPort = {
    name: 'Claude',
    port: new ClaudeSummarizationAdapter(claude),
  };

  const gemini = new GeminiClient(http, () => configStore.googleKey());
  const geminiAdapter: NamedSummarizationPort = {
    name: 'Gemini',
    port: new GeminiSummarizationAdapter(gemini),
  };

  const summaryAdapters: Record<SummaryStep, NamedSummarizationPort> = {
    openai: openaiAdapter,
    'openai-reasoning': openaiPremiumAdapter,
    anthropic: claudeAdapter,
    gemini: geminiAdapter,
  };
  const summarization = new SummarizationChainAdapter(() =>
    SUMMARY_CHAINS[configStore.get().summaryQuality].map((step) => summaryAdapters[step]),
  );

  const mindMapPort = new LLMMindMapAdapter(openai);
  const sentimentParser = new SentimentScoreParser();
  const importTemplates = new ImportTemplatesUseCase(templateRegistry);
  const regenerateSummaries = new RegenerateSummariesUseCase(summarization, meetingRepo);
  const generateMindMap = new GenerateMindMapUseCase(mindMapPort);

  const audio = new MediaRecorderAdapter();
  const screenWake = new WakeLockAdapter();

  return {
    configStore,
    audio,
    screenWake,
    startRecording: new StartRecordingUseCase(audio),
    stopRecording: new StopRecordingUseCase(audio),
    transcribeChunk: new TranscribeChunkUseCase(transcription),
    generateSummaries: new GenerateSummariesUseCase(summarization),
    generateMindMap,
    finalizeMeeting: new FinalizeMeetingUseCase(
      summarization,
      mindMapPort,
      meetingRepo,
      sentimentParser,
    ),
    saveMeeting: new SaveMeetingUseCase(meetingRepo),
    listMeetings: new ListMeetingsUseCase(meetingRepo),
    deleteMeeting: new DeleteMeetingUseCase(meetingRepo),
    clearMeetings: new ClearMeetingsUseCase(meetingRepo),
    getMeeting: new GetMeetingUseCase(meetingRepo),
    getConfig: new GetConfigUseCase(configRepo),
    updateConfig: new UpdateConfigUseCase(configRepo),
    validateApiKey: new ValidateApiKeyUseCase(new HttpApiKeyValidator(http)),
    listTemplates: new ListTemplatesUseCase(templateRegistry),
    saveTemplate: new SaveTemplateUseCase(templateRegistry),
    exportTemplate: new ExportTemplateUseCase(templateRegistry),
    importTemplates,
    importMeeting: new ImportMeetingUseCase(
      meetingRepo,
      templateRegistry,
      importTemplates,
      regenerateSummaries,
      generateMindMap,
      sentimentParser,
    ),
    deleteTemplate: new DeleteTemplateUseCase(templateRegistry, meetingRepo),
    regenerateSummaries,
    templateRegistry,
  };
};
