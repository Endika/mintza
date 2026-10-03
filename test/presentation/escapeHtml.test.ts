import { describe, expect, it } from 'vitest';
import { escapeHtml } from '../../src/presentation/util/escapeHtml';

describe('escapeHtml', () => {
  it('escapes every character that can break text or an attribute', () => {
    expect(escapeHtml(`<b>"Tom" & 'Jerry'</b>`)).toBe(
      '&lt;b&gt;&quot;Tom&quot; &amp; &#39;Jerry&#39;&lt;/b&gt;',
    );
  });

  it('keeps a user-entered template name inert inside an option', () => {
    const host = document.createElement('select');
    const name = `Retro"><img src=x onerror=alert(1)>`;
    host.innerHTML = `<option value="${escapeHtml('custom-1')}">${escapeHtml(name)}</option>`;
    expect(host.querySelector('img')).toBeNull();
    expect(host.options[0]?.textContent).toBe(name);
  });
});
