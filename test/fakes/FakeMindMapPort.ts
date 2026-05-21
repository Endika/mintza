import { MindMap } from '../../src/domain/mindmap/entities/MindMap';
import type { MindMapPort, MindMapRequest } from '../../src/domain/mindmap/ports/MindMapPort';
import { MindMapNode } from '../../src/domain/mindmap/value-objects/MindMapNode';
import { AppError, type AppErrorCode } from '../../src/shared/errors/AppError';
import { err, ok, type Result } from '../../src/shared/result/Result';

export class FakeMindMapPort implements MindMapPort {
  readonly calls: MindMapRequest[] = [];

  constructor(
    private readonly behavior:
      | { kind: 'success'; rootLabel: string; childLabels?: readonly string[] }
      | { kind: 'failure'; code: AppErrorCode; message: string },
  ) {}

  generate(request: MindMapRequest): Promise<Result<MindMap, AppError>> {
    this.calls.push(request);
    if (this.behavior.kind === 'failure') {
      return Promise.resolve(err(new AppError(this.behavior.code, this.behavior.message)));
    }
    const children = (this.behavior.childLabels ?? []).map(
      (label) => new MindMapNode(label, []),
    );
    return Promise.resolve(ok(new MindMap(new MindMapNode(this.behavior.rootLabel, children))));
  }
}
