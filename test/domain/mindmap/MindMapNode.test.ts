import { describe, expect, it } from 'vitest';
import { MindMap } from '../../../src/domain/mindmap/entities/MindMap';
import { MindMapNode } from '../../../src/domain/mindmap/value-objects/MindMapNode';

describe('MindMapNode', () => {
  it('rejects empty labels', () => {
    expect(() => new MindMapNode('  ', [])).toThrow();
  });

  it('reports leaf nodes', () => {
    const leaf = new MindMapNode('leaf', []);
    expect(leaf.isLeaf()).toBe(true);
    expect(leaf.depth()).toBe(1);
  });

  it('computes nested depth', () => {
    const grandchild = new MindMapNode('grand', []);
    const child = new MindMapNode('child', [grandchild]);
    const root = new MindMapNode('root', [child]);
    expect(root.depth()).toBe(3);
  });

  it('counts every node through the mind map', () => {
    const mindMap = new MindMap(
      new MindMapNode('root', [new MindMapNode('a', [new MindMapNode('b', [])])]),
    );
    expect(mindMap.nodeCount()).toBe(3);
  });
});
