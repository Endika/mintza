import type { Translator } from '../i18n/Translator';

export class UpdateBanner {
  private banner: HTMLElement | null = null;

  show(onReload: () => void, translator: Translator): void {
    if (this.banner) return;
    const node = document.createElement('div');
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'polite');
    node.className =
      'fixed top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-full ' +
      'border border-ink-100 bg-white/95 px-4 py-2 shadow-lg text-sm backdrop-blur';
    node.style.setProperty('color', '#1f2937');
    node.innerHTML = `
      <span class="inline-flex items-center gap-2">
        <span class="inline-block h-1.5 w-1.5 rounded-full bg-primary"></span>
        <span class="font-medium">${translator.t('update.title')}</span>
      </span>
      <button type="button" data-reload class="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white hover:bg-primary-600 transition-colors">
        ${translator.t('update.reload')}
      </button>
      <button type="button" data-dismiss aria-label="${translator.t('update.dismiss')}" class="text-ink-400 hover:text-ink-600 transition-colors text-base leading-none">×</button>
    `;
    node.querySelector<HTMLButtonElement>('[data-reload]')?.addEventListener('click', () => onReload());
    node.querySelector<HTMLButtonElement>('[data-dismiss]')?.addEventListener('click', () => this.hide());
    document.body.appendChild(node);
    this.banner = node;
  }

  hide(): void {
    this.banner?.remove();
    this.banner = null;
  }
}
