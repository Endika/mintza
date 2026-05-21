export class UpdateBanner {
  private banner: HTMLElement | null = null;

  show(onReload: () => void): void {
    if (this.banner) return;
    const node = document.createElement('div');
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'polite');
    node.className =
      'fixed top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-full ' +
      'bg-primary text-white px-4 py-2 shadow-lg text-sm';
    node.innerHTML = `
      <span>New version available</span>
      <button type="button" class="rounded-full bg-white/20 px-3 py-0.5 text-xs font-medium hover:bg-white/30">
        Reload
      </button>
      <button type="button" data-dismiss aria-label="Dismiss" class="opacity-70 hover:opacity-100">✕</button>
    `;
    const reloadBtn = node.querySelector<HTMLButtonElement>('button:not([data-dismiss])');
    const dismissBtn = node.querySelector<HTMLButtonElement>('[data-dismiss]');
    reloadBtn?.addEventListener('click', () => onReload());
    dismissBtn?.addEventListener('click', () => this.hide());
    document.body.appendChild(node);
    this.banner = node;
  }

  hide(): void {
    this.banner?.remove();
    this.banner = null;
  }
}
