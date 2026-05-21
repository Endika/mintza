import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../../src/presentation/util/renderMarkdown';

describe('renderMarkdown', () => {
  it('renders headings of levels 1 to 4', () => {
    expect(renderMarkdown('# H1\n## H2\n### H3\n#### H4')).toBe(
      '<h1>H1</h1><h2>H2</h2><h3>H3</h3><h4>H4</h4>',
    );
  });

  it('renders bold, italic and inline code', () => {
    expect(renderMarkdown('a **bold** and *italic* and `code`')).toBe(
      '<p>a <strong>bold</strong> and <em>italic</em> and <code>code</code></p>',
    );
  });

  it('renders bullet lists with - and *', () => {
    expect(renderMarkdown('- one\n- two\n* three')).toBe(
      '<ul><li>one</li><li>two</li><li>three</li></ul>',
    );
  });

  it('renders ordered lists', () => {
    expect(renderMarkdown('1. first\n2. second')).toBe(
      '<ol><li>first</li><li>second</li></ol>',
    );
  });

  it('separates paragraphs by blank lines and keeps line breaks inside', () => {
    expect(renderMarkdown('first line\nsame paragraph\n\nnew paragraph')).toBe(
      '<p>first line<br/>same paragraph</p><p>new paragraph</p>',
    );
  });

  it('escapes HTML so injected markup is inert', () => {
    expect(renderMarkdown('<script>alert(1)</script>')).toBe(
      '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>',
    );
  });

  it('does not let attributes in code spans break out', () => {
    expect(renderMarkdown('use `<img src=x onerror=alert(1)>`')).toBe(
      '<p>use <code>&lt;img src=x onerror=alert(1)&gt;</code></p>',
    );
  });

  it('mixes heading and following list', () => {
    expect(renderMarkdown('## Actions\n- do this\n- and that')).toBe(
      '<h2>Actions</h2><ul><li>do this</li><li>and that</li></ul>',
    );
  });

  it('returns empty string for empty input', () => {
    expect(renderMarkdown('')).toBe('');
  });
});
