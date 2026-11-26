import { GenerateMindMapUseCase } from '../../src/application/use-cases/GenerateMindMapUseCase';
import { ImportMeetingUseCase } from '../../src/application/use-cases/ImportMeetingUseCase';
import { ImportTemplatesUseCase } from '../../src/application/use-cases/ImportTemplatesUseCase';
import { ListTemplatesUseCase } from '../../src/application/use-cases/ListTemplatesUseCase';
import { RegenerateSummariesUseCase } from '../../src/application/use-cases/RegenerateSummariesUseCase';
import { TemplateRegistry } from '../../src/domain/meeting/services/TemplateRegistry';
import { SentimentScoreParser } from '../../src/domain/temperature/services/SentimentScoreParser';
import { LocalStorageTemplateRepository } from '../../src/infrastructure/persistence/LocalStorageTemplateRepository';
import { FakeMindMapPort } from '../fakes/FakeMindMapPort';
import { FakeSummarizationPort } from '../fakes/FakeSummarizationPort';
import type { InMemoryMeetingRepository } from '../fakes/InMemoryMeetingRepository';

export const buildImporters = (
  repo: InMemoryMeetingRepository,
): { importMeeting: ImportMeetingUseCase; listTemplates: ListTemplatesUseCase } => {
  window.localStorage.clear();
  const registry = new TemplateRegistry(new LocalStorageTemplateRepository(window.localStorage));
  return {
    listTemplates: new ListTemplatesUseCase(registry),
    importMeeting: new ImportMeetingUseCase(
      repo,
      registry,
      new ImportTemplatesUseCase(registry),
      new RegenerateSummariesUseCase(
        new FakeSummarizationPort({ kind: 'success', content: 'x' }),
        repo,
      ),
      new GenerateMindMapUseCase(new FakeMindMapPort({ kind: 'success', rootLabel: 'Map' })),
      new SentimentScoreParser(),
    ),
  };
};
