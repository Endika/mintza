export interface MindMapNodeProps {
  readonly label: string;
  readonly children: readonly MindMapNode[];
}

export class MindMapNode {
  constructor(
    public readonly label: string,
    public readonly children: readonly MindMapNode[],
  ) {
    if (label.trim().length === 0) {
      throw new Error('MindMapNode label cannot be empty');
    }
  }

  isLeaf(): boolean {
    return this.children.length === 0;
  }

  depth(): number {
    if (this.isLeaf()) return 1;
    return 1 + Math.max(...this.children.map((c) => c.depth()));
  }
}
