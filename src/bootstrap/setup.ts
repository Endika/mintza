import { DeleteMeetingUseCase } from '../application/use-cases/DeleteMeetingUseCase';
import { GenerateMindMapUseCase } from '../application/use-cases/GenerateMindMapUseCase';
import { GenerateSummariesUseCase } from '../application/use-cases/GenerateSummariesUseCase';
import { GetConfigUseCase } from '../application/use-cases/GetConfigUseCase';
import { ListMeetingsUseCase } from '../application/use-cases/ListMeetingsUseCase';
import { SaveMeetingUseCase } from '../application/use-cases/SaveMeetingUseCase';
import { StartRecordingUseCase } from '../application/use-cases/StartRecordingUseCase';
import { StopRecordingUseCase } from '../application/use-cases/StopRecordingUseCase';
import { TranscribeChunkUseCase } from '../application/use-cases/TranscribeChunkUseCase';
import { UpdateConfigUseCase } from '../application/use-cases/UpdateConfigUseCase';
import { ValidateApiKeyUseCase } from '../application/use-cases/ValidateApiKeyUseCase';
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
import { SummarizationChainAdapter } from '../infrastructure/llm/SummarizationChainAdapter';
import { IndexedDBMeetingRepository } from '../infrastructure/persistence/IndexedDBMeetingRepository';
import { LocalStorageConfigRepository } from '../infrastructure/persistence/LocalStorageConfigRepository';
import { AzureSpeechClient } from '../infrastructure/transcription/AzureSpeechClient';
import { AzureSpeechTranscriptionAdapter } from '../infrastructure/transcription/AzureSpeechTranscriptionAdapter';
import { GoogleSpeechClient } from '../infrastructure/transcription/GoogleSpeechClient';
import { GoogleSpeechTranscriptionAdapter } from '../infrastructure/transcription/GoogleSpeechTranscriptionAdapter';
import { TranscriptionChainAdapter } from '../infrastructure/transcription/TranscriptionChainAdapter';
import { WhisperClient } from '../infrastructure/transcription/WhisperClient';
import { WhisperTranscriptionAdapter } from '../infrastructure/transcription/WhisperTranscriptionAdapter';
import { ConfigStore } from '../presentation/state/ConfigStore';
import type { SummarizationPort } from '../domain/summary/ports/SummarizationPort';
import type { TranscriptionPort } from '../domain/transcription/ports/TranscriptionPort';

export interface AppDeps {
  readonly configStore: ConfigStore;
  readonly audio: MediaRecorderAdapter;
  readonly startRecording: StartRecordingUseCase;
  readonly stopRecording: StopRecordingUseCase;
  readonly transcribeChunk: TranscribeChunkUseCase;
  readonly generateSummaries: GenerateSummariesUseCase;
  readonly generateMindMap: GenerateMindMapUseCase;
  readonly saveMeeting: SaveMeetingUseCase;
  readonly listMeetings: ListMeetingsUseCase;
  readonly deleteMeeting: DeleteMeetingUseCase;
  readonly getConfig: GetConfigUseCase;
  readonly updateConfig: UpdateConfigUseCase;
  readonly validateApiKey: ValidateApiKeyUseCase;
}

export const buildAppDeps = (): AppDeps => {
  const http = new HttpClient();
  const configRepo = new LocalStorageConfigRepository();
  const configStore = new ConfigStore(configRepo);
  const meetingRepo = new IndexedDBMeetingRepository();

  const whisper = new WhisperClient(http, () => configStore.openAIKey());
  const whisperAdapter = new WhisperTranscriptionAdapter(whisper);
  const googleSpeech = new GoogleSpeechClient(http, () => configStore.googleKey());
  const googleSpeechAdapter = new GoogleSpeechTranscriptionAdapter(googleSpeech);
  const azureSpeech = new AzureSpeechClient(
    http,
    () => configStore.azureKey(),
    () => configStore.azureRegion(),
  );
  const azureSpeechAdapter = new AzureSpeechTranscriptionAdapter(azureSpeech);

  const transcription = new TranscriptionChainAdapter(() =>
    pickTranscriptionChain(configStore.get().transcriptionQuality, {
      cheap: [googleSpeechAdapter, whisperAdapter],
      balanced: [whisperAdapter, googleSpeechAdapter],
      premium: [whisperAdapter, azureSpeechAdapter],
    }),
  );

  const openai = new OpenAIClient(http, () => configStore.openAIKey());
  const openaiAdapter = new OpenAISummarizationAdapter(openai);
  const openaiPremiumAdapter = new OpenAISummarizationAdapter(openai, { model: 'gpt-4o' });

  const claude = new ClaudeClient(http, () => configStore.anthropicKey());
  const claudeAdapter = new ClaudeSummarizationAdapter(claude);

  const gemini = new GeminiClient(http, () => configStore.googleKey());
  const geminiAdapter = new GeminiSummarizationAdapter(gemini);

  const summarization = new SummarizationChainAdapter(() =>
    pickChain(configStore.get().summaryQuality, {
      cheap: [geminiAdapter, claudeAdapter, openaiAdapter],
      balanced: [openaiAdapter, claudeAdapter, geminiAdapter],
      premium: [openaiPremiumAdapter],
    }),
  );

  const audio = new MediaRecorderAdapter();

  return {
    configStore,
    audio,
    startRecording: new StartRecordingUseCase(audio),
    stopRecording: new StopRecordingUseCase(audio),
    transcribeChunk: new TranscribeChunkUseCase(transcription),
    generateSummaries: new GenerateSummariesUseCase(summarization),
    generateMindMap: new GenerateMindMapUseCase(new LLMMindMapAdapter(openai)),
    saveMeeting: new SaveMeetingUseCase(meetingRepo),
    listMeetings: new ListMeetingsUseCase(meetingRepo),
    deleteMeeting: new DeleteMeetingUseCase(meetingRepo),
    getConfig: new GetConfigUseCase(configRepo),
    updateConfig: new UpdateConfigUseCase(configRepo),
    validateApiKey: new ValidateApiKeyUseCase(new HttpApiKeyValidator(http)),
  };
};

const pickChain = (
  quality: 'cheap' | 'balanced' | 'premium',
  chains: Record<'cheap' | 'balanced' | 'premium', readonly SummarizationPort[]>,
): readonly SummarizationPort[] => chains[quality];

const pickTranscriptionChain = (
  quality: 'cheap' | 'balanced' | 'premium',
  chains: Record<'cheap' | 'balanced' | 'premium', readonly TranscriptionPort[]>,
): readonly TranscriptionPort[] => chains[quality];
