import { CONFIG_STORAGE_KEY } from '../shared/constants/storageKeys.ts';
import { TRANSLATIONS, type TranslationKey } from '../presentation/i18n/translations.ts';

// The h1 each route renders; a meeting's title is only known once it loads.
const PAGE_TITLES: Record<string, TranslationKey> = {
  '/': 'home.new_meeting',
  '/history': 'history.title',
  '/settings': 'settings.title',
  '/templates': 'templates.title',
};

const UNSAFE_IN_SCRIPT: Record<string, string> = {
  '<': '\\u003c',
  '>': '\\u003e',
  '/': '\\u002f',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
};

/** JSON that is safe to place inside an inline <script>. */
export const scriptLiteral = (value: unknown): string =>
  JSON.stringify(value).replace(/[<>/\u2028\u2029]/g, (ch) => UNSAFE_IN_SCRIPT[ch] ?? ch);

/** Runs before the app hydrates, so the first paint and announcement use the stored language. */
export const bootDocumentScript = (): string => {
  const titles = Object.fromEntries(
    Object.entries(TRANSLATIONS).map(([code, strings]) => [
      code,
      Object.fromEntries(Object.entries(PAGE_TITLES).map(([path, key]) => [path, strings[key]])),
    ]),
  );
  const own = 'Object.prototype.hasOwnProperty.call';
  return `(function(){try{var T=${scriptLiteral(titles)};var c=JSON.parse(localStorage.getItem(${scriptLiteral(CONFIG_STORAGE_KEY)})||'null');var l=c&&c.language;if(typeof l!=='string'||!${own}(T,l))return;document.documentElement.lang=l;var p=(location.hash.replace(/^#/,'')||'/').split('?')[0].toLowerCase();if(p==='/meeting')return;document.title=(${own}(T[l],p)?T[l][p]:T[l]['/'])+' · Mintza'}catch(e){}})();`;
};
