import type { LanguageCode } from '../../domain/language/value-objects/Language';

export const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  en: 'English',
  es: 'Español',
  eu: 'Euskara',
};

export const languageName = (code: LanguageCode): string => LANGUAGE_NAMES[code];
