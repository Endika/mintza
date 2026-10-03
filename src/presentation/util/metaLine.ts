import { escapeHtml } from './escapeHtml';

/** Each value stays whole and carries the separator before it, so no line ends on a "·". */
export const metaLine = (parts: readonly string[]): string =>
  parts
    .map(
      (part, i) => `<span class="whitespace-nowrap">${i > 0 ? '· ' : ''}${escapeHtml(part)}</span>`,
    )
    .join(' ');
