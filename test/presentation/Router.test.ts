import { beforeEach, describe, expect, it } from 'vitest';
import { Router, type Page } from '../../src/presentation/router/Router';

class StubPage implements Page {
  rendered = false;
  disposed = false;
  asked = 0;
  constructor(
    private readonly heading: string,
    public leave: boolean = true,
    private readonly delayMs = 0,
  ) {}
  async render(root: HTMLElement): Promise<void> {
    if (this.delayMs) await new Promise((r) => setTimeout(r, this.delayMs));
    root.innerHTML = `<h1>${this.heading}</h1>`;
    this.rendered = true;
  }
  dispose(): void {
    this.disposed = true;
  }
  canLeave(): boolean {
    this.asked++;
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
  beforeEach(() => {
    document.body.innerHTML = '<main id="main"></main>';
    root = document.getElementById('main') as HTMLElement;
    window.location.hash = '#/';
  });

  it('titles the document and focuses the heading after navigating', async () => {
    const router = new Router(
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
    const router = new Router(
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
    expect(window.location.hash).toBe('#/');
    busy.leave = true;
  });

  it('only shows the last of two quick navigations', async () => {
    const router = new Router(
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
});
