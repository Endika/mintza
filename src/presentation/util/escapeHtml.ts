const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export const escapeHtml = (raw: string): string =>
  raw.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch] ?? ch);
