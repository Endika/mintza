import { escapeHtml } from './escapeHtml';

/** The gap separates the values, so a wrapped line never starts or ends on a stray separator. */
export const metaLine = (parts: readonly string[]): string =>
  `<span class="meta-line">${parts
    .map((part) => `<span class="min-w-0 max-w-full break-words">${escapeHtml(part)}</span>`)
    .join('')}</span>`;
