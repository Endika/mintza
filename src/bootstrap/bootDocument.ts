import { CONFIG_STORAGE_KEY } from '../infrastructure/persistence/LocalStorageConfigRepository';
import type { TranslationKey } from '../presentation/i18n/translations';
import { TRANSLATIONS } from '../presentation/i18n/translations';

// The h1 each route renders; a meeting's title is only known once it loads.
const PAGE_TITLES: Record<string, TranslationKey> = {
  '/': 'home.new_meeting',
  '/history': 'history.title',
  '/settings': 'settings.title',
  '/templates': 'templates.title',
};

/** Runs before the app hydrates, so the first paint and announcement use the stored language. */
export const bootDocumentScript = (): string => {
  const titles = Object.fromEntries(
    Object.entries(TRANSLATIONS).map(([code, strings]) => [
      code,
      Object.fromEntries(Object.entries(PAGE_TITLES).map(([path, key]) => [path, strings[key]])),
    ]),
  );
  const own = 'Object.prototype.hasOwnProperty.call';
  return `(function(){try{var T=${JSON.stringify(titles).replace(/</g, '\\u003c')};var c=JSON.parse(localStorage.getItem(${JSON.stringify(CONFIG_STORAGE_KEY)})||'null');var l=c&&c.language;if(typeof l!=='string'||!${own}(T,l))return;document.documentElement.lang=l;var p=(location.hash.replace(/^#/,'')||'/').split('?')[0].toLowerCase();if(p==='/meeting')return;document.title=(${own}(T[l],p)?T[l][p]:T[l]['/'])+' · Mintza'}catch(e){}})();`;
};
