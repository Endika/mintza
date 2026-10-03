import type { LanguageCode } from '../../domain/language/value-objects/Language';
import { TRANSLATIONS, type TranslationKey } from './translations';

export class Translator {
  constructor(private current: LanguageCode = 'en') {}

  get language(): LanguageCode {
    return this.current;
  }

  setLanguage(code: LanguageCode): void {
    this.current = code;
  }

  t(key: TranslationKey, vars?: Record<string, string | number>): string {
    const text = TRANSLATIONS[this.current][key];
    if (!vars) return text;
    return text.replace(/\{(\w+)\}/g, (match, name: string) =>
      Object.hasOwn(vars, name) ? String(vars[name]) : match,
    );
  }
}
