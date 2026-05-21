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
import { WhisperClient } from '../infrastructure/transcription/WhisperClient';
import { WhisperTranscriptionAdapter } from '../infrastructure/transcription/WhisperTranscriptionAdapter';
import { ConfigStore } from '../presentation/state/ConfigStore';

export interface AppDeps {
  readonly configStore: ConfigStore;
  readonly audio: MediaRecorderAdapter;
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
  readonly deleteTemplate: DeleteTemplateUseCase;
  readonly regenerateSummaries: RegenerateSummariesUseCase;
  readonly templateRegistry: TemplateRegistry;
}

export const buildAppDeps = (): AppDeps => {
  const http = new HttpClient();
  const configRepo = new LocalStorageConfigRepository();
  const configStore = new ConfigStore(configRepo);
  const meetingRepo = new IndexedDBMeetingRepository();
  const templateRepo = new LocalStorageTemplateRepository();
  const templateRegistry = new TemplateRegistry(templateRepo);

  const whisper = new WhisperClient(http, () => configStore.openAIKey());
  const whisperAdapter: NamedTranscriptionPort = {
    name: 'Whisper',
    port: new WhisperTranscriptionAdapter(whisper),
  };
  const googleSpeech = new GoogleSpeechClient(http, () => configStore.googleKey());
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

  const transcription = new TranscriptionChainAdapter(() =>
    pickTranscriptionChain(configStore.get().transcriptionQuality, {
      cheap: [googleSpeechAdapter, whisperAdapter],
      balanced: [whisperAdapter, googleSpeechAdapter],
      premium: [whisperAdapter, azureSpeechAdapter],
    }),
  );

  const openai = new OpenAIClient(http, () => configStore.openAIKey());
  const openaiAdapter: NamedSummarizationPort = {
    name: 'GPT-4o-mini',
    port: new OpenAISummarizationAdapter(openai),
  };
  const openaiPremiumAdapter: NamedSummarizationPort = {
    name: 'GPT-4o',
    port: new OpenAISummarizationAdapter(openai, { model: 'gpt-4o' }),
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

  const summarization = new SummarizationChainAdapter(() =>
    pickChain(configStore.get().summaryQuality, {
      cheap: [geminiAdapter, claudeAdapter, openaiAdapter],
      balanced: [openaiAdapter, claudeAdapter, geminiAdapter],
      premium: [openaiPremiumAdapter],
    }),
  );

  const mindMapPort = new LLMMindMapAdapter(openai);
  const sentimentParser = new SentimentScoreParser();

  const audio = new MediaRecorderAdapter();

  return {
    configStore,
    audio,
    startRecording: new StartRecordingUseCase(audio),
    stopRecording: new StopRecordingUseCase(audio),
    transcribeChunk: new TranscribeChunkUseCase(transcription),
    generateSummaries: new GenerateSummariesUseCase(summarization),
    generateMindMap: new GenerateMindMapUseCase(mindMapPort),
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
    deleteTemplate: new DeleteTemplateUseCase(templateRegistry, meetingRepo),
    regenerateSummaries: new RegenerateSummariesUseCase(summarization, meetingRepo),
    templateRegistry,
  };
};

const pickChain = (
  quality: 'cheap' | 'balanced' | 'premium',
  chains: Record<'cheap' | 'balanced' | 'premium', readonly NamedSummarizationPort[]>,
): readonly NamedSummarizationPort[] => chains[quality];

const pickTranscriptionChain = (
  quality: 'cheap' | 'balanced' | 'premium',
  chains: Record<'cheap' | 'balanced' | 'premium', readonly NamedTranscriptionPort[]>,
): readonly NamedTranscriptionPort[] => chains[quality];
