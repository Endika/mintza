import type { LanguageCode } from '../../domain/language/value-objects/Language';
import { TRANSLATIONS, type TranslationKey } from './translations';

export class Translator {
  constructor(private current: LanguageCode = 'en') {}

  setLanguage(code: LanguageCode): void {
    this.current = code;
  }

  t(key: TranslationKey): string {
    const dictionary = TRANSLATIONS[this.current];
    return dictionary[key];
  }
}
