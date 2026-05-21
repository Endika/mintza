import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

const r = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@domain': r('./src/domain'),
      '@application': r('./src/application'),
      '@infrastructure': r('./src/infrastructure'),
      '@presentation': r('./src/presentation'),
      '@shared': r('./src/shared'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/main.ts',
        'src/App.ts',
        'src/**/*.d.ts',
        'src/bootstrap/**',
        'src/presentation/**',
        'src/infrastructure/audio/**',
        'src/infrastructure/http/**',
        'src/infrastructure/persistence/**',
        'src/infrastructure/api/**',
        'src/infrastructure/export/**',
        'src/infrastructure/llm/{OpenAI,Claude,Gemini,LLMMindMap}*.ts',
        'src/infrastructure/llm/*Adapter.ts',
        'src/infrastructure/transcription/{Whisper,Google,Azure}Client.ts',
        'src/infrastructure/transcription/*Adapter.ts',
        'src/application/use-cases/StartRecordingUseCase.ts',
        'src/application/use-cases/StopRecordingUseCase.ts',
        'src/application/use-cases/TranscribeChunkUseCase.ts',
        'src/application/use-cases/SaveMeetingUseCase.ts',
        'src/application/use-cases/ListMeetingsUseCase.ts',
        'src/application/use-cases/DeleteMeetingUseCase.ts',
        'src/application/use-cases/GetConfigUseCase.ts',
        'src/application/use-cases/UpdateConfigUseCase.ts',
        'src/application/use-cases/ValidateApiKeyUseCase.ts',
        'src/application/use-cases/GenerateMindMapUseCase.ts',
        'src/**/ports/**',
        'src/domain/statistics/value-objects/Statistics.ts',
        'src/domain/summary/value-objects/LLMProvider.ts',
        'src/domain/transcription/value-objects/TranscriptionProvider.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
