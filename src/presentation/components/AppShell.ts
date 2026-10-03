import type { Translator } from '../i18n/Translator';
import type { TranslationKey } from '../i18n/translations';
import { ICON_HISTORY, ICON_RECORD, ICON_SETTINGS } from './icons';

interface Tab {
  readonly href: string;
  readonly labelKey: TranslationKey;
  readonly icon: string;
  readonly paths: readonly string[];
}

const TABS: readonly Tab[] = [
  { href: '#/', labelKey: 'nav.record', icon: ICON_RECORD, paths: ['/'] },
  {
    href: '#/history',
    labelKey: 'nav.history',
    icon: ICON_HISTORY,
    paths: ['/history', '/meeting'],
  },
  {
    href: '#/settings',
    labelKey: 'nav.settings',
    icon: ICON_SETTINGS,
    paths: ['/settings', '/templates'],
  },
];

export class AppShell {
  readonly main: HTMLElement;
  private readonly skip: HTMLAnchorElement;
  private readonly nav: HTMLElement;
  private readonly tabs: HTMLAnchorElement[];
  private readonly labels: HTMLElement[];

  constructor(
    host: HTMLElement,
    private readonly t: Translator,
  ) {
    this.skip = document.createElement('a');
    this.skip.href = '#/';
    this.skip.className =
      'sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-[var(--radius-control)] focus:bg-surface focus:px-4 focus:py-3 focus:font-semibold focus:text-fg';
    this.skip.addEventListener('click', (e) => {
      e.preventDefault();
      this.main.focus();
    });

    this.nav = document.createElement('nav');
    this.nav.className = 'tabbar';
    this.nav.innerHTML = `
      <a href="#/" class="tabbar-wordmark">Mintza</a>
      <div class="tabbar-tabs">
        ${TABS.map(
          (tab) =>
            `<a href="${tab.href}" class="tab"><span class="tab-icon">${tab.icon}</span><span data-label></span></a>`,
        ).join('')}
      </div>
    `;
    this.tabs = [...this.nav.querySelectorAll<HTMLAnchorElement>('.tab')];
    this.labels = this.tabs.map((tab) => tab.querySelector<HTMLElement>('[data-label]')!);

    this.main = document.createElement('main');
    this.main.id = 'main';
    this.main.tabIndex = -1;
    this.main.className = 'shell-main';

    host.replaceChildren(this.skip, this.nav, this.main);
    this.relabel();
  }

  setActive(path: string): void {
    // Unknown paths render Home through the router fallback.
    const active = Math.max(
      0,
      TABS.findIndex((tab) => tab.paths.includes(path)),
    );
    this.tabs.forEach((tab, i) => {
      if (i === active) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    });
  }

  setBusy(busy: boolean): void {
    this.nav.hidden = busy;
    this.nav.inert = busy;
  }

  relabel(): void {
    this.skip.textContent = this.t.t('home.skip');
    this.nav.setAttribute('aria-label', this.t.t('nav.main'));
    this.labels.forEach((label, i) => {
      label.textContent = this.t.t(TABS[i]!.labelKey);
    });
  }
}
