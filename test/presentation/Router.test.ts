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
    router = new Router(
      root,
      new Map([
        ['/', () => new StubPage('Home')],
        ['/history', () => new StubPage('History', true, 30)],
        ['/settings', () => new StubPage('Settings')],
      ]),
      () => new StubPage('Home'),
    );
    router.start();
    await flush();
    window.location.hash = '#/history';
    await go('#/settings', 60);
    expect(root.textContent).toBe('Settings');
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
});
