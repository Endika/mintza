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
  private leaving: Promise<boolean> | undefined;
  private readonly abort = new AbortController();

  constructor(
    private readonly root: HTMLElement,
    private readonly routes: Map<string, PageFactory>,
    private readonly fallback: PageFactory,
    private readonly options: RouterOptions = {},
  ) {}

  start(): void {
    window.addEventListener(
      'hashchange',
      (e) => {
        if (e.oldURL && window.location.hash === this.currentHash) return;
        void this.handle();
      },
      { signal: this.abort.signal },
    );
    void this.handle();
  }

  stop(): void {
    this.abort.abort();
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
    const initial = this.firstRender;
    this.firstRender = false;
    const generation = ++this.generation;
    const guarded = this.current;
    if (guarded?.canLeave && target !== this.currentHash) {
      this.leaving ??= Promise.resolve(guarded.canLeave()).finally(() => {
        this.leaving = undefined;
      });
      const leave = await this.leaving;
      if (generation !== this.generation) return;
      if (!leave) {
        history.replaceState(null, '', this.currentHash || '#/');
        return;
      }
    }
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
    this.announce(initial);
  }

  private announce(initial: boolean): void {
    const heading = this.root.querySelector('h1');
    const text = heading?.textContent?.trim();
    document.title = text ? `${text} · Mintza` : 'Mintza';
    if (initial || !heading) return;
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }
}
