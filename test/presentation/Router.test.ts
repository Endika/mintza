import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Router, type Page, type PageFactory } from '../../src/presentation/router/Router';

class StubPage implements Page {
  rendered = false;
  disposed = false;
  asked = 0;
  constructor(
    private readonly heading: string,
    public leave: boolean = true,
    private readonly delayMs = 0,
    private readonly leaveDelayMs = 0,
  ) {}
  async render(root: HTMLElement): Promise<void> {
    if (this.delayMs) await new Promise((r) => setTimeout(r, this.delayMs));
    root.innerHTML = `<h1>${this.heading}</h1>`;
    this.rendered = true;
  }
  dispose(): void {
    this.disposed = true;
  }
  async canLeave(): Promise<boolean> {
    this.asked++;
    if (this.leaveDelayMs) await new Promise((r) => setTimeout(r, this.leaveDelayMs));
    return this.leave;
  }
}

const flush = (ms = 0): Promise<void> => new Promise((r) => setTimeout(r, ms));
const go = async (hash: string, ms = 0): Promise<void> => {
  window.location.hash = hash;
  await flush(ms);
};

describe('Router', () => {
  let root: HTMLElement;
  let router: Router | undefined;
  beforeEach(() => {
    document.body.innerHTML = '<main id="main"></main>';
    root = document.getElementById('main') as HTMLElement;
    window.location.hash = '#/';
  });
  afterEach(() => router?.stop());

  it('titles the document and focuses the heading after navigating', async () => {
    router = new Router(
      root,
      new Map([
        ['/', () => new StubPage('Home')],
        ['/history', () => new StubPage('History')],
      ]),
      () => new StubPage('Home'),
    );
    router.start();
    await flush();
    await go('#/history');
    expect(document.title).toBe('History · Mintza');
    expect(document.activeElement?.textContent).toBe('History');
  });

  it('stays on a page that refuses to leave and restores its hash', async () => {
    const busy = new StubPage('Recording', false);
    router = new Router(
      root,
      new Map([
        ['/', () => busy],
        ['/history', () => new StubPage('History')],
      ]),
      () => busy,
    );
    router.start();
    await flush();
    await go('#/history');
    expect(root.textContent).toBe('Recording');
    expect(busy.asked).toBeGreaterThan(0);
    expect(busy.disposed).toBe(false);
    expect(window.location.hash).toBe('#/');
  });

  it('only shows the last of two quick navigations', async () => {
    let started = 0;
    class Late extends StubPage {
      override render(r: HTMLElement): Promise<void> {
        started++;
        return super.render(r);
      }
    }
    router = new Router(
      root,
      new Map([
        ['/', () => new StubPage('Home')],
        ['/history', () => new Late('History', true, 30)],
        ['/settings', () => new StubPage('Settings')],
      ]),
      () => new StubPage('Home'),
    );
    router.start();
    await flush();
    window.location.hash = '#/history';
    await flush(5);
    expect(started).toBe(1);
    await go('#/settings', 60);
    expect(root.textContent).toBe('Settings');
    expect(document.title).toBe('Settings · Mintza');
    expect(root.textContent).not.toContain('History');
  });

  it('re-renders when navigating to the hash already shown', async () => {
    let renders = 0;
    class Counting extends StubPage {
      override render(r: HTMLElement): Promise<void> {
        renders++;
        return super.render(r);
      }
    }
    router = new Router(
      root,
      new Map([['/', () => new Counting('Home')]]),
      () => new Counting('Home'),
    );
    router.start();
    await flush();
    Router.navigate('#/');
    await flush();
    expect(renders).toBe(2);
  });

  it('asks once while a leave check is pending and renders the last target', async () => {
    const slow = new StubPage('Home', true, 0, 30);
    router = new Router(
      root,
      new Map([
        ['/', () => slow],
        ['/history', () => new StubPage('History')],
        ['/settings', () => new StubPage('Settings')],
      ]),
      () => slow,
    );
    router.start();
    await flush();
    window.location.hash = '#/history';
    await flush(5);
    await go('#/settings', 80);
    expect(slow.asked).toBe(1);
    expect(root.textContent).toBe('Settings');
  });

  it('keeps the shown page alive on Back while a leave check is pending', async () => {
    let renders = 0;
    let historyRenders = 0;
    class Counting extends StubPage {
      override render(r: HTMLElement): Promise<void> {
        renders++;
        return super.render(r);
      }
    }
    const slow = new Counting('Home', true, 0, 30);
    router = new Router(
      root,
      new Map<string, PageFactory>([
        ['/', () => slow],
        [
          '/history',
          async () => {
            await flush(10);
            historyRenders++;
            return new StubPage('History');
          },
        ],
      ]),
      () => slow,
    );
    router.start();
    await flush();
    window.location.hash = '#/history';
    await flush(5);
    await go('#/', 80);
    expect(window.location.hash).toBe('#/');
    expect(root.textContent).toBe('Home');
    expect(slow.disposed).toBe(false);
    expect(renders).toBe(1);
    expect(historyRenders).toBe(0);
  });

  it('follows a Back to the shown hash while the next page is still loading', async () => {
    router = new Router(
      root,
      new Map<string, PageFactory>([
        ['/', () => new StubPage('Home')],
        [
          '/history',
          async () => {
            await flush(40);
            return new StubPage('History');
          },
        ],
      ]),
      () => new StubPage('Home'),
    );
    router.start();
    await flush();
    window.location.hash = '#/history';
    await flush(5);
    await go('#/', 80);
    expect(window.location.hash).toBe('#/');
    expect(root.textContent).toBe('Home');
  });

  it('asks before re-rendering the shown hash and keeps the page when refused', async () => {
    let renders = 0;
    class Counting extends StubPage {
      override render(r: HTMLElement): Promise<void> {
        renders++;
        return super.render(r);
      }
    }
    const busy = new Counting('Recording', false);
    router = new Router(root, new Map([['/', () => busy]]), () => busy);
    router.start();
    await flush();
    Router.navigate('#/');
    await flush();
    expect(busy.asked).toBe(1);
    expect(busy.disposed).toBe(false);
    expect(renders).toBe(1);
    expect(root.textContent).toBe('Recording');
    expect(window.location.hash).toBe('#/');

    busy.leave = true;
    Router.navigate('#/');
    await flush();
    expect(busy.asked).toBe(2);
    expect(busy.disposed).toBe(true);
    expect(renders).toBe(2);
  });

  it('asks again after a Back cancelled a pending leave check', async () => {
    const slow = new StubPage('Home', true, 0, 30);
    router = new Router(
      root,
      new Map([
        ['/', () => slow],
        ['/history', () => new StubPage('History')],
        ['/settings', () => new StubPage('Settings')],
      ]),
      () => slow,
    );
    router.start();
    await flush();
    window.location.hash = '#/history';
    await flush(5);
    window.location.hash = '#/';
    await flush(5);
    await go('#/settings', 80);
    expect(slow.asked).toBe(2);
    expect(root.textContent).toBe('Settings');
  });

  describe('with the Navigation API', () => {
    class FakeNavigation extends EventTarget {
      announce(
        navigationType: 'push' | 'replace' | 'traverse',
        extra: { hashChange?: boolean; downloadRequest?: string | null } = {},
      ): void {
        this.dispatchEvent(
          Object.assign(new Event('navigate'), {
            navigationType,
            hashChange: true,
            downloadRequest: null,
            ...extra,
          }),
        );
      }
    }
    let navigation: FakeNavigation;
    const goes: number[] = [];
    beforeEach(() => {
      navigation = new FakeNavigation();
      goes.length = 0;
      Object.defineProperty(window, 'navigation', { value: navigation, configurable: true });
      // A real browser announces the traverse that history.go starts.
      history.go = (delta?: number): void => {
        goes.push(delta ?? 0);
        navigation.announce('traverse');
        History.prototype.go.call(history, delta);
      };
    });
    afterEach(() => {
      Reflect.deleteProperty(window, 'navigation');
      Reflect.deleteProperty(history, 'go');
    });

    it('steps back over a refused push instead of leaving a duplicate entry', async () => {
      const busy = new StubPage('Recording', false);
      router = new Router(
        root,
        new Map([
          ['/', () => busy],
          ['/history', () => new StubPage('History')],
        ]),
        () => busy,
      );
      history.replaceState({ entry: 'home' }, '', '#/');
      router.start();
      await flush();
      const length = history.length;

      navigation.announce('push');
      await go('#/history', 10);

      expect(window.location.hash).toBe('#/');
      expect(history.state).toEqual({ entry: 'home' });
      expect(history.length).toBe(length + 1);
      expect(busy.asked).toBe(1);
      expect(root.textContent).toBe('Recording');
    });

    it('steps back over every push a refused leave check covered', async () => {
      const busy = new StubPage('Recording', false, 0, 20);
      router = new Router(
        root,
        new Map([
          ['/', () => busy],
          ['/history', () => new StubPage('History')],
          ['/settings', () => new StubPage('Settings')],
        ]),
        () => busy,
      );
      history.replaceState({ entry: 'home' }, '', '#/');
      router.start();
      await flush();

      navigation.announce('push');
      window.location.hash = '#/history';
      await flush(5);
      navigation.announce('push');
      await go('#/settings', 60);

      expect(window.location.hash).toBe('#/');
      expect(history.state).toEqual({ entry: 'home' });
      expect(busy.asked).toBe(1);
      expect(root.textContent).toBe('Recording');
    });

    it('replaces the entry when a Back is refused', async () => {
      const busy = new StubPage('Recording', false);
      router = new Router(
        root,
        new Map([
          ['/', () => new StubPage('Home')],
          ['/history', () => busy],
        ]),
        () => new StubPage('Home'),
      );
      window.location.hash = '#/history';
      await flush();
      router.start();
      await flush();

      navigation.announce('traverse');
      history.back();
      await flush(10);

      expect(window.location.hash).toBe('#/history');
      expect(busy.asked).toBe(1);
      expect(root.textContent).toBe('Recording');
    });

    it('ignores a download and a same-URL link, then steps back over one refused push', async () => {
      const busy = new StubPage('Recording', false);
      router = new Router(
        root,
        new Map([
          ['/', () => busy],
          ['/history', () => new StubPage('History')],
        ]),
        () => busy,
      );
      history.replaceState({ entry: 'home' }, '', '#/');
      router.start();
      await flush();
      const length = history.length;

      navigation.announce('push', { hashChange: false, downloadRequest: 'sync.md' });
      navigation.announce('replace', { hashChange: false });
      navigation.announce('push');
      await go('#/history', 10);

      expect(goes).toEqual([-1]);
      expect(window.location.hash).toBe('#/');
      expect(history.state).toEqual({ entry: 'home' });
      expect(history.length).toBe(length + 1);
      expect(root.textContent).toBe('Recording');

      navigation.announce('push');
      await go('#/history', 10);

      expect(goes).toEqual([-1, -1]);
      expect(history.state).toEqual({ entry: 'home' });
      expect(busy.asked).toBe(2);
    });
  });
});
