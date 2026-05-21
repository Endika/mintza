import type { MindMapNode } from '../value-objects/MindMapNode';

export class MindMap {
  constructor(public readonly root: MindMapNode) {}

  nodeCount(): number {
    return count(this.root);
  }
}

const count = (node: MindMapNode): number =>
  1 + node.children.reduce((total, child) => total + count(child), 0);
