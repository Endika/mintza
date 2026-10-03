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

interface NavigateEventLike extends Event {
  readonly navigationType?: string;
  readonly hashChange?: boolean;
  readonly downloadRequest?: string | null;
}

export class Router {
  private current: Page | undefined;
  private currentHash = '';
  private lastTargetHash = '';
  private generation = 0;
  private firstRender = true;
  private leaving: Promise<boolean> | undefined;
  /** With the Navigation API, refused pushes are stepped back over instead of overwritten. */
  private tracking = false;
  private pushes = 0;
  private popped = false;
  private undoingTraverse = false;
  private readonly abort = new AbortController();

  constructor(
    private readonly root: HTMLElement,
    private readonly routes: Map<string, PageFactory>,
    private readonly fallback: PageFactory,
    private readonly options: RouterOptions = {},
  ) {}

  start(): void {
    const navigation = (window as { navigation?: EventTarget }).navigation;
    if (navigation) {
      this.tracking = true;
      navigation.addEventListener('navigate', (e: NavigateEventLike) => this.track(e), {
        signal: this.abort.signal,
      });
    }
    window.addEventListener(
      'hashchange',
      (e) => {
        if (e.oldURL && window.location.hash === this.lastTargetHash) return;
        void this.handle(!e.oldURL);
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

  /** Only hash navigations count: a download or a same-URL link never reaches the router. */
  private track(e: NavigateEventLike): void {
    if ((e.downloadRequest ?? null) !== null || !e.hashChange) return;
    if (e.navigationType === 'push') this.pushes++;
    else if (e.navigationType !== 'traverse') return;
    else if (this.undoingTraverse) this.undoingTraverse = false;
    else this.popped = true;
  }

  private async handle(force = true): Promise<void> {
    const target = window.location.hash;
    this.lastTargetHash = target;
    if (!force && this.current && target === this.currentHash) {
      this.generation++;
      this.leaving = undefined;
      this.resetPushes();
      return;
    }
    const initial = this.firstRender;
    this.firstRender = false;
    const generation = ++this.generation;
    const guarded = this.current;
    const sameHash = target === this.currentHash;
    if (guarded?.canLeave && (force || !sameHash)) {
      const asking: Promise<boolean> = (this.leaving ??= Promise.resolve(
        guarded.canLeave(),
      ).finally(() => {
        if (this.leaving === asking) this.leaving = undefined;
      }));
      const leave = await asking;
      if (generation !== this.generation) return;
      if (!leave) {
        if (!sameHash) this.restore();
        return;
      }
    }
    this.resetPushes();
    this.current?.dispose?.();
    this.current = undefined;
    const raw = target.replace(/^#/, '') || '/';
    const path = (raw.split('?')[0] ?? '/').toLowerCase();
    const factory = this.routes.get(path);
    const page = await (typeof factory === 'function' ? factory : this.fallback)();
    if (generation !== this.generation) return;
    this.current = page;
    this.currentHash = target;
    // A superseded render then writes into a detached node instead of the screen.
    const container = document.createElement('div');
    this.root.replaceChildren(container);
    await page.render(container);
    if (generation !== this.generation) return;
    this.options.onNavigate?.(path);
    this.announce(container, initial);
  }

  private restore(): void {
    const restored = this.currentHash || '#/';
    this.lastTargetHash = restored;
    if (this.tracking && !this.popped && this.pushes > 0) {
      this.undoingTraverse = true;
      history.go(-this.pushes);
    } else {
      history.replaceState(null, '', restored);
    }
    this.resetPushes();
  }

  private resetPushes(): void {
    this.pushes = 0;
    this.popped = false;
  }

  private announce(container: HTMLElement, initial: boolean): void {
    const heading = titleFromHeading(container);
    if (initial || !heading) return;
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }
}

export const titleFromHeading = (container: HTMLElement): HTMLHeadingElement | null => {
  const heading = container.querySelector('h1');
  const text = heading?.textContent?.trim();
  document.title = text ? `${text} · Mintza` : 'Mintza';
  return heading;
};
