export type LanguageCode = 'es' | 'en' | 'eu';

const SUPPORTED: ReadonlySet<LanguageCode> = new Set(['es', 'en', 'eu']);

export class Language {
  private constructor(public readonly code: LanguageCode) {}

  static of(code: LanguageCode): Language {
    if (!SUPPORTED.has(code)) {
      throw new Error(`Unsupported language code: ${code}`);
    }
    return new Language(code);
  }

  static fromBrowser(navigatorLanguage: string): Language {
    const prefix = navigatorLanguage.toLowerCase().slice(0, 2);
    if (prefix === 'eu') return new Language('eu');
    if (prefix === 'es') return new Language('es');
    return new Language('en');
  }

  static default(): Language {
    return new Language('es');
  }

  equals(other: Language): boolean {
    return this.code === other.code;
  }

  toString(): string {
    return this.code;
  }
}
