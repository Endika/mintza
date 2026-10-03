export interface Page {
  render(root: HTMLElement): void | Promise<void>;
  dispose?(): void;
  /** Return false to stay on the page; may ask the user first. */
  canLeave?(): boolean | Promise<boolean>;
}

export interface RouterOptions {
  onNavigate?: (path: string) => void;
}

export type PageFactory = () => Page | Promise<Page>;

export class Router {
  private current: Page | undefined;
  private currentHash = '';
  private generation = 0;
  private firstRender = true;

  constructor(
    private readonly root: HTMLElement,
    private readonly routes: Map<string, PageFactory>,
    private readonly fallback: PageFactory,
    private readonly options: RouterOptions = {},
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
    const target = window.location.hash;
    if (this.current?.canLeave && target !== this.currentHash) {
      const leave = await this.current.canLeave();
      if (!leave) {
        history.replaceState(null, '', this.currentHash || '#/');
        return;
      }
    }
    const generation = ++this.generation;
    this.current?.dispose?.();
    this.current = undefined;
    const raw = target.replace(/^#/, '') || '/';
    const path = (raw.split('?')[0] ?? '/').toLowerCase();
    const page = await (this.routes.get(path) ?? this.fallback)();
    if (generation !== this.generation) return;
    this.current = page;
    this.currentHash = target;
    await page.render(this.root);
    if (generation !== this.generation) return;
    this.options.onNavigate?.(path);
    this.announce();
  }

  private announce(): void {
    const heading = this.root.querySelector('h1');
    document.title = heading?.textContent ? `${heading.textContent.trim()} · Mintza` : 'Mintza';
    if (this.firstRender) {
      this.firstRender = false;
      return;
    }
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  }
}
