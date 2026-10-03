import type { LanguageCode } from '../../domain/language/value-objects/Language';

export const applyDocumentLanguage = (code: LanguageCode): void => {
  document.documentElement.lang = code;
};
