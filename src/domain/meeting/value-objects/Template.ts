import { SUMMARY_KINDS, type SummaryKind } from '../../summary/value-objects/SummaryKind';

export type TemplateKind = string;

export interface TemplateDefinition {
  readonly id: string;
  readonly name: string;
  readonly builtIn: boolean;
  readonly systemRole: string;
  readonly mindMapStructure: string;
  readonly summaryKinds: readonly SummaryKind[];
  readonly featuredOrder: readonly SummaryKind[];
  readonly kindLabels: Readonly<Partial<Record<SummaryKind, string>>>;
  readonly promptOverrides: Readonly<Partial<Record<SummaryKind, string>>>;
}

export const BUILT_IN_TEMPLATES = {
  work: {
    id: 'work',
    name: 'Work',
    builtIn: true,
    systemRole: 'a work meeting',
    mindMapStructure: 'Meeting → Objectives, Decisions, Actions, Blockers, Next steps',
    summaryKinds: SUMMARY_KINDS,
    featuredOrder: [
      'decisions',
      'action_items',
      'next_steps',
      'bullet_points',
      'timeline',
      'keywords',
      'sentiment',
      'one_liner',
    ] as readonly SummaryKind[],
    kindLabels: {},
    promptOverrides: {},
  },
  interview: {
    id: 'interview',
    name: 'Interview',
    builtIn: true,
    systemRole: 'a job interview',
    mindMapStructure:
      'Candidate → Strengths, Areas to improve, Experience, Cultural fit, Recommendation',
    summaryKinds: SUMMARY_KINDS,
    featuredOrder: [
      'sentiment',
      'action_items',
      'keywords',
      'bullet_points',
      'decisions',
      'timeline',
      'next_steps',
      'one_liner',
    ] as readonly SummaryKind[],
    kindLabels: {},
    promptOverrides: {},
  },
  generic: {
    id: 'generic',
    name: 'Generic',
    builtIn: true,
    systemRole: 'a general conversation',
    mindMapStructure: 'Central topic → Subtopics, Ideas, Actions',
    summaryKinds: SUMMARY_KINDS,
    featuredOrder: [
      'bullet_points',
      'one_liner',
      'keywords',
      'sentiment',
      'action_items',
      'decisions',
      'next_steps',
      'timeline',
    ] as readonly SummaryKind[],
    kindLabels: {},
    promptOverrides: {},
  },
} as const satisfies Record<string, TemplateDefinition>;

const BUILT_IN_IDS = new Set(Object.keys(BUILT_IN_TEMPLATES));

export class Template {
  private constructor(private readonly def: TemplateDefinition) {}

  static fromDefinition(def: TemplateDefinition): Template {
    if (def.id.trim().length === 0) throw new Error('Template id cannot be empty');
    if (def.name.trim().length === 0) throw new Error('Template name cannot be empty');
    if (def.summaryKinds.length === 0) throw new Error('Template needs at least one summary kind');
    return new Template(def);
  }

  static of(kindOrId: string): Template {
    const builtIn = BUILT_IN_TEMPLATES[kindOrId as keyof typeof BUILT_IN_TEMPLATES];
    if (!builtIn) throw new Error(`Unknown built-in template: ${kindOrId}`);
    return new Template(builtIn);
  }

  static work(): Template {
    return new Template(BUILT_IN_TEMPLATES.work);
  }

  static interview(): Template {
    return new Template(BUILT_IN_TEMPLATES.interview);
  }

  static generic(): Template {
    return new Template(BUILT_IN_TEMPLATES.generic);
  }

  static isBuiltInId(id: string): boolean {
    return BUILT_IN_IDS.has(id);
  }

  get id(): string {
    return this.def.id;
  }

  get kind(): string {
    return this.def.id;
  }

  get name(): string {
    return this.def.name;
  }

  get builtIn(): boolean {
    return this.def.builtIn;
  }

  get systemRole(): string {
    return this.def.systemRole;
  }

  get mindMapStructure(): string {
    return this.def.mindMapStructure;
  }

  get summaryKinds(): readonly SummaryKind[] {
    return this.def.summaryKinds;
  }

  get kindLabels(): Readonly<Partial<Record<SummaryKind, string>>> {
    return this.def.kindLabels;
  }

  get promptOverrides(): Readonly<Partial<Record<SummaryKind, string>>> {
    return this.def.promptOverrides;
  }

  featuredSummaryOrder(): readonly SummaryKind[] {
    return this.def.featuredOrder.filter((k) => this.def.summaryKinds.includes(k));
  }

  labelFor(kind: SummaryKind, fallback: string): string {
    return this.def.kindLabels[kind] ?? fallback;
  }

  promptFor(kind: SummaryKind, fallback: string): string {
    return this.def.promptOverrides[kind] ?? fallback;
  }

  toDefinition(): TemplateDefinition {
    return this.def;
  }

  equals(other: Template): boolean {
    return this.def.id === other.def.id;
  }
}
