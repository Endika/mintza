import { MindMap } from '../entities/MindMap';
import { MindMapNode } from '../value-objects/MindMapNode';

interface RawNode {
  readonly label?: unknown;
  readonly children?: unknown;
}

const MAX_DEPTH = 6;

export class MindMapJsonParser {
  parse(rawJson: string): MindMap {
    const cleaned = stripMarkdownFences(rawJson).trim();
    const parsed = JSON.parse(cleaned) as RawNode;
    const root = toNode(parsed, 0);
    return new MindMap(root);
  }
}

const toNode = (raw: RawNode, depth: number): MindMapNode => {
  if (depth > MAX_DEPTH) {
    throw new Error(`Mind map exceeds maximum depth ${MAX_DEPTH}`);
  }
  const label = typeof raw.label === 'string' ? raw.label.trim() : '';
  if (label.length === 0) throw new Error('Mind map node label missing');
  const rawChildren = Array.isArray(raw.children) ? (raw.children as RawNode[]) : [];
  const children = rawChildren.map((child) => toNode(child, depth + 1));
  return new MindMapNode(label, children);
};

const stripMarkdownFences = (raw: string): string => {
  const match = /^```(?:json)?\s*([\s\S]*?)\s*```\s*$/i.exec(raw.trim());
  return match?.[1] ?? raw;
};
