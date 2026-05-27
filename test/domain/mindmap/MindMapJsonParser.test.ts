import { describe, expect, it } from 'vitest';
import { MindMapJsonParser } from '../../../src/domain/mindmap/services/MindMapJsonParser';

describe('MindMapJsonParser', () => {
  const parser = new MindMapJsonParser();

  it('parses a valid nested mind map', () => {
    const mindMap = parser.parse(
      JSON.stringify({
        label: 'Project',
        children: [
          { label: 'Goals', children: [{ label: 'Ship MVP', children: [] }] },
          { label: 'Risks', children: [] },
        ],
      }),
    );
    expect(mindMap.root.label).toBe('Project');
    expect(mindMap.root.children).toHaveLength(2);
    expect(mindMap.nodeCount()).toBe(4);
  });

  it('strips markdown fences around the JSON', () => {
    const mindMap = parser.parse('```json\n{"label":"R","children":[]}\n```');
    expect(mindMap.root.label).toBe('R');
  });

  it('rejects nodes without a label', () => {
    expect(() => parser.parse('{"children": []}')).toThrow();
  });

  it('rejects deeply nested mind maps', () => {
    const nest = (depth: number): unknown =>
      depth === 0
        ? { label: 'leaf', children: [] }
        : { label: `d${depth}`, children: [nest(depth - 1)] };
    expect(() => parser.parse(JSON.stringify(nest(8)))).toThrow();
  });
});
