export type TemplateKind = 'work' | 'interview' | 'generic';

const SUPPORTED: ReadonlySet<TemplateKind> = new Set(['work', 'interview', 'generic']);

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

  equals(other: Template): boolean {
    return this.kind === other.kind;
  }
}
