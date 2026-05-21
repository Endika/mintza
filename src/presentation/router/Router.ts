export interface Page {
  render(root: HTMLElement): void | Promise<void>;
  dispose?(): void;
}

export type PageFactory = () => Page | Promise<Page>;

export class Router {
  private current?: Page;

  constructor(
    private readonly root: HTMLElement,
    private readonly routes: Map<string, PageFactory>,
    private readonly fallback: PageFactory,
  ) {}

  start(): void {
    window.addEventListener('hashchange', () => {
      void this.handle();
    });
    void this.handle();
  }

  static navigate(path: string): void {
    if (!path.startsWith('#')) path = `#${path}`;
    if (window.location.hash === path) {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } else {
      window.location.hash = path;
    }
  }

  private async handle(): Promise<void> {
    this.current?.dispose?.();
    const raw = window.location.hash.replace(/^#/, '') || '/';
    const path = (raw.split('?')[0] ?? '/').toLowerCase();
    const factory = this.routes.get(path) ?? this.fallback;
    const page = await factory();
    this.current = page;
    await page.render(this.root);
  }
}
