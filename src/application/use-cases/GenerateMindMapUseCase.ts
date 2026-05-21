import type { Meeting } from '../../domain/meeting/entities/Meeting';
import type { MindMap } from '../../domain/mindmap/entities/MindMap';
import type { MindMapPort } from '../../domain/mindmap/ports/MindMapPort';
import type { AppError } from '../../shared/errors/AppError';
import type { Result } from '../../shared/result/Result';

export interface GenerateMindMapInput {
  readonly meeting: Meeting;
}

export class GenerateMindMapUseCase {
  constructor(private readonly port: MindMapPort) {}

  async execute(input: GenerateMindMapInput): Promise<Result<MindMap, AppError>> {
    const result = await this.port.generate({
      transcript: input.meeting.fullText(),
      template: input.meeting.template,
      language: input.meeting.language,
    });
    if (result.ok) input.meeting.setMindMap(result.value);
    return result;
  }
}
