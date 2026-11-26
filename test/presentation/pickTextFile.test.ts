import { afterEach, describe, expect, it } from 'vitest';
import { pickTextFile } from '../../src/presentation/util/pickTextFile';

type Outcome = 'change' | 'cancel';

describe('pickTextFile', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it.each<[string, Outcome, unknown, string | null]>([
    ['a chosen file', 'change', { text: () => Promise.resolve('hello') }, 'hello'],
    ['no file chosen', 'change', undefined, null],
    ['a cancelled dialog', 'cancel', undefined, null],
    ['an unreadable file', 'change', { text: () => Promise.reject(new Error('no')) }, null],
  ])('resolves for %s', async (_name, outcome, file, expected) => {
    let input!: HTMLInputElement;
    const created = document.createElement.bind(document);
    const doc = Object.create(document, {
      createElement: {
        value: (tag: string) => {
          input = created(tag) as HTMLInputElement;
          input.click = () => {
            expect(document.body.contains(input)).toBe(true);
            expect(input.hidden).toBe(true);
            Object.defineProperty(input, 'files', { value: file ? [file] : [] });
            input.dispatchEvent(new Event(outcome));
          };
          return input;
        },
      },
      body: { value: document.body },
    }) as Document;

    await expect(pickTextFile(doc)).resolves.toBe(expected);

    expect(input.type).toBe('file');
    expect(input.accept).toBe('.json,application/json');
    expect(document.body.contains(input)).toBe(false);
  });
});
