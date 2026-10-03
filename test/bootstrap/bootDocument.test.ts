import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bootDocumentScript } from '../../src/bootstrap/bootDocument';
import { Translator } from '../../src/presentation/i18n/Translator';

const KEY = 'mintza:config:v1';

// Indirect eval runs the source at global scope, as the browser runs an inline <script>.
const boot = (): void => {
  globalThis.eval(bootDocumentScript());
};

describe('the inline boot script', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = 'en';
    document.title = 'Mintza';
    window.location.hash = '#/';
  });

  afterEach(() => {
    window.localStorage.clear();
    window.location.hash = '';
  });

  it('sets the stored language and the page title the router will show', () => {
    window.localStorage.setItem(KEY, JSON.stringify({ language: 'es', apiKeys: {} }));
    window.location.hash = '#/history';

    boot();

    expect(document.documentElement.lang).toBe('es');
    expect(document.title).toBe(`${new Translator('es').t('history.title')} · Mintza`);
  });

  it.each([
    ['#/', 'home.new_meeting'],
    ['', 'home.new_meeting'],
    ['#/Settings', 'settings.title'],
    ['#/templates', 'templates.title'],
    ['#/unknown', 'home.new_meeting'],
  ] as const)('titles %s like the page it renders', (hash, key) => {
    window.localStorage.setItem(KEY, JSON.stringify({ language: 'eu' }));
    window.location.hash = hash;

    boot();

    expect(document.documentElement.lang).toBe('eu');
    expect(document.title).toBe(`${new Translator('eu').t(key)} · Mintza`);
  });

  it('leaves a meeting title to the page, which knows the meeting', () => {
    window.localStorage.setItem(KEY, JSON.stringify({ language: 'es' }));
    window.location.hash = '#/meeting?id=abc';

    boot();

    expect(document.documentElement.lang).toBe('es');
    expect(document.title).toBe('Mintza');
  });

  it.each([
    ['absent', null],
    ['not JSON', '{oops'],
    ['a number', '42'],
    ['null', 'null'],
    ['a bare string', '"es"'],
    ['an unsupported language', '{"language":"fr"}'],
    ['a non-string language', '{"language":{"es":1}}'],
    ['an inherited key', '{"language":"constructor"}'],
  ])('keeps the static defaults when the stored config is %s', (_, raw) => {
    if (raw !== null) window.localStorage.setItem(KEY, raw);
    window.location.hash = '#/history';

    expect(boot).not.toThrow();

    expect(document.documentElement.lang).toBe('en');
    expect(document.title).toBe('Mintza');
  });

  it('keeps the static defaults when storage cannot be read', () => {
    window.localStorage.setItem(KEY, JSON.stringify({ language: 'es' }));
    const storage = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => {
        throw new DOMException('denied', 'SecurityError');
      },
    });
    try {
      expect(boot).not.toThrow();
    } finally {
      if (storage) Object.defineProperty(window, 'localStorage', storage);
    }

    expect(document.documentElement.lang).toBe('en');
    expect(document.title).toBe('Mintza');
  });

  it('reaches only dependency-free modules, since the build config imports it', () => {
    const runtimeImports = (file: string): string[] =>
      [...readFileSync(file, 'utf8').matchAll(/^import (?!type )[^;]*?from '([^']+)';/gms)].map(
        (m) => m[1]!,
      );

    expect(runtimeImports('src/bootstrap/bootDocument.ts').sort()).toEqual([
      '../presentation/i18n/translations',
      '../shared/constants/storageKeys',
    ]);
    expect(runtimeImports('src/presentation/i18n/translations.ts')).toEqual([]);
    expect(runtimeImports('src/shared/constants/storageKeys.ts')).toEqual([]);
  });
});
