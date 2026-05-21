import type { SummaryKind } from '../../summary/value-objects/SummaryKind';

export type TemplateKind = 'work' | 'interview' | 'generic';

const SUPPORTED: ReadonlySet<TemplateKind> = new Set(['work', 'interview', 'generic']);

const FEATURED_ORDER: Record<TemplateKind, readonly SummaryKind[]> = {
  work: [
    'decisions',
    'action_items',
    'next_steps',
    'bullet_points',
    'timeline',
    'keywords',
    'sentiment',
    'one_liner',
  ],
  interview: [
    'sentiment',
    'action_items',
    'keywords',
    'bullet_points',
    'decisions',
    'timeline',
    'next_steps',
    'one_liner',
  ],
  generic: [
    'bullet_points',
    'one_liner',
    'keywords',
    'sentiment',
    'action_items',
    'decisions',
    'next_steps',
    'timeline',
  ],
};

export class Template {
  private constructor(public readonly kind: TemplateKind) {}

  static of(kind: TemplateKind): Template {
    if (!SUPPORTED.has(kind)) {
      throw new Error(`Unsupported template kind: ${kind}`);
    }
    return new Template(kind);
  }

  static work(): Template {
    return new Template('work');
  }

  static interview(): Template {
    return new Template('interview');
  }

  static generic(): Template {
    return new Template('generic');
  }

  featuredSummaryOrder(): readonly SummaryKind[] {
    return FEATURED_ORDER[this.kind];
  }

  equals(other: Template): boolean {
    return this.kind === other.kind;
  }
}
