import type { MindMap } from '../../domain/mindmap/entities/MindMap';
import type {
  MindMapPort,
  MindMapRequest,
} from '../../domain/mindmap/ports/MindMapPort';
import { MindMapJsonParser } from '../../domain/mindmap/services/MindMapJsonParser';
import { MindMapPromptBuilder } from '../../domain/mindmap/services/MindMapPromptBuilder';
import { AppError } from '../../shared/errors/AppError';
import { err, ok, type Result } from '../../shared/result/Result';
import type { OpenAIClient } from './OpenAIClient';

const DEFAULT_MODEL = 'gpt-4o-mini';

export class LLMMindMapAdapter implements MindMapPort {
  private readonly prompts = new MindMapPromptBuilder();
  private readonly parser = new MindMapJsonParser();

  constructor(
    private readonly client: OpenAIClient,
    private readonly model: string = DEFAULT_MODEL,
  ) {}

  async generate(request: MindMapRequest): Promise<Result<MindMap, AppError>> {
    const prompt = this.prompts.build(request);
    const response = await this.client.chat({
      model: this.model,
      system: prompt.system,
      user: prompt.user,
      maxTokens: 1500,
    });
    if (!response.ok) return response;
    try {
      const mindMap = this.parser.parse(response.value.content);
      return ok(mindMap);
    } catch (cause) {
      return err(new AppError('SUMMARIZATION_FAILED', 'Invalid mind map JSON', cause));
    }
  }
}
