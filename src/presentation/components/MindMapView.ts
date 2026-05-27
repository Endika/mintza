import type { MindMap } from '../../domain/mindmap/entities/MindMap';
import type { MindMapNode } from '../../domain/mindmap/value-objects/MindMapNode';

const BRANCH_COLORS = ['#00B380', '#6366F1', '#F97316', '#EAB308', '#EC4899', '#0EA5E9'];

export class MindMapView {
  render(target: HTMLElement, mindMap: MindMap): void {
    target.innerHTML = `
      <div>
        <h4 class="text-lg font-semibold mb-3">${escape(mindMap.root.label)}</h4>
        <ul class="space-y-2">
          ${mindMap.root.children
            .map((branch, index) =>
              this.renderBranch(branch, BRANCH_COLORS[index % BRANCH_COLORS.length] ?? '#00B380'),
            )
            .join('')}
        </ul>
      </div>
    `;
    target.querySelectorAll<HTMLElement>('[data-toggle]').forEach((el) => {
      el.addEventListener('click', () => {
        const list = el.nextElementSibling;
        if (!(list instanceof HTMLElement)) return;
        const collapsed = list.classList.toggle('hidden');
        el.setAttribute('aria-expanded', String(!collapsed));
      });
    });
  }

  private renderBranch(node: MindMapNode, color: string): string {
    return `
      <li>
        <div class="flex items-center gap-2">
          <span class="inline-block h-2 w-2 rounded-full" style="background:${color}"></span>
          ${
            node.isLeaf()
              ? `<span class="font-medium">${escape(node.label)}</span>`
              : `<button type="button" data-toggle aria-expanded="true" class="font-medium text-left hover:underline">${escape(node.label)}</button>`
          }
        </div>
        ${node.isLeaf() ? '' : `<ul class="mt-1 ml-5 space-y-1 border-l-2 pl-3" style="border-color:${color}">${node.children.map((c) => this.renderLeaf(c)).join('')}</ul>`}
      </li>
    `;
  }

  private renderLeaf(node: MindMapNode): string {
    if (node.isLeaf()) {
      return `<li class="text-sm text-ink-600">${escape(node.label)}</li>`;
    }
    return `
      <li>
        <div class="text-sm font-medium">${escape(node.label)}</div>
        <ul class="ml-4 list-disc space-y-0.5 text-sm text-ink-600">
          ${node.children.map((c) => `<li>${escape(c.label)}</li>`).join('')}
        </ul>
      </li>
    `;
  }
}

const escape = (raw: string): string =>
  raw.replace(/[&<>"]/g, (ch) =>
    ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : '&quot;',
  );
