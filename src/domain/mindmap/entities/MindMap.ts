import type { TokenCount } from '../../tokens/value-objects/TokenCount';
import type { MindMapNode } from '../value-objects/MindMapNode';

export interface MindMapUsage {
  readonly model: string;
  readonly tokensIn: TokenCount;
  readonly tokensOut: TokenCount;
}

export class MindMap {
  constructor(
    public readonly root: MindMapNode,
    public readonly usage?: MindMapUsage,
  ) {}

  nodeCount(): number {
    return count(this.root);
  }
}

const count = (node: MindMapNode): number =>
  1 + node.children.reduce((total, child) => total + count(child), 0);
