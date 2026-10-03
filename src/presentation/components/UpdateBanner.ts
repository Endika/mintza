import type { Translator } from '../i18n/Translator';
import { ICON_CLOSE } from './icons';

export class UpdateBanner {
  private banner: HTMLElement | null = null;

  show(onReload: () => void, translator: Translator): void {
    if (this.banner) return;
    const node = document.createElement('div');
    node.setAttribute('role', 'status');
    node.className =
      'card fixed inset-x-4 top-3 z-50 mx-auto flex max-w-md items-center gap-2 py-2 pr-2 pl-4 sm:py-2 sm:pr-2 sm:pl-5';
    node.innerHTML = `
      <span class="min-w-0 flex-1 font-medium">${translator.t('update.title')}</span>
      <button type="button" data-reload class="btn-action shrink-0 px-4">${translator.t('update.reload')}</button>
      <button type="button" data-dismiss aria-label="${translator.t('update.dismiss')}" class="btn-ghost size-11 shrink-0 px-0 text-fg-muted">${ICON_CLOSE}</button>
    `;
    node
      .querySelector<HTMLButtonElement>('[data-reload]')
      ?.addEventListener('click', () => onReload());
    node
      .querySelector<HTMLButtonElement>('[data-dismiss]')
      ?.addEventListener('click', () => this.hide());
    document.body.appendChild(node);
    this.banner = node;
  }

  hide(): void {
    this.banner?.remove();
    this.banner = null;
  }
}
