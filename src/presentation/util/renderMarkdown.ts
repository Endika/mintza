const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const escapeHtml = (raw: string): string => raw.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch] ?? ch);

const renderInline = (text: string): string => {
  let html = escapeHtml(text);
  html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  return html;
};

const HEADING_RE = /^(#{1,4})\s+(.+)$/;
const BULLET_RE = /^\s*[-*]\s+/;
const ORDERED_RE = /^\s*\d+\.\s+/;

export const renderMarkdown = (markdown: string): string => {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';
    if (line.trim() === '') {
      i += 1;
      continue;
    }
    const heading = HEADING_RE.exec(line);
    if (heading) {
      const level = heading[1]?.length ?? 1;
      out.push(`<h${level}>${renderInline(heading[2] ?? '')}</h${level}>`);
      i += 1;
      continue;
    }
    if (BULLET_RE.test(line)) {
      const items: string[] = [];
      while (i < lines.length && BULLET_RE.test(lines[i] ?? '')) {
        items.push((lines[i] ?? '').replace(BULLET_RE, ''));
        i += 1;
      }
      out.push(`<ul>${items.map((it) => `<li>${renderInline(it)}</li>`).join('')}</ul>`);
      continue;
    }
    if (ORDERED_RE.test(line)) {
      const items: string[] = [];
      while (i < lines.length && ORDERED_RE.test(lines[i] ?? '')) {
        items.push((lines[i] ?? '').replace(ORDERED_RE, ''));
        i += 1;
      }
      out.push(`<ol>${items.map((it) => `<li>${renderInline(it)}</li>`).join('')}</ol>`);
      continue;
    }
    const paragraph: string[] = [];
    while (i < lines.length) {
      const current = lines[i] ?? '';
      if (
        current.trim() === '' ||
        HEADING_RE.test(current) ||
        BULLET_RE.test(current) ||
        ORDERED_RE.test(current)
      ) {
        break;
      }
      paragraph.push(current);
      i += 1;
    }
    out.push(`<p>${paragraph.map(renderInline).join('<br/>')}</p>`);
  }
  return out.join('');
};
