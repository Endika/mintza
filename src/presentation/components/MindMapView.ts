import type { MindMap } from '../../domain/mindmap/entities/MindMap';
import type { MindMapNode } from '../../domain/mindmap/value-objects/MindMapNode';
import { escapeHtml } from '../util/escapeHtml';

// Neither the action green nor the live red: branches only need telling apart.
const BRANCH_COLORS = [
  'var(--color-fg)',
  'var(--color-warning)',
  'var(--color-fg-muted)',
  'var(--color-edge)',
] as const;

export class MindMapView {
  render(target: HTMLElement, mindMap: MindMap): void {
    target.innerHTML = `
      <h4 class="mb-3 break-words font-semibold">${escapeHtml(mindMap.root.label)}</h4>
      <ul class="flex flex-col gap-2">
        ${mindMap.root.children
          .map((branch, index) =>
            this.renderBranch(
              branch,
              BRANCH_COLORS[index % BRANCH_COLORS.length] ?? BRANCH_COLORS[0],
            ),
          )
          .join('')}
      </ul>
    `;
    target.querySelectorAll<HTMLElement>('[data-toggle]').forEach((el) => {
      el.addEventListener('click', () => {
        const list = el.parentElement?.nextElementSibling;
        if (!(list instanceof HTMLElement)) return;
        const collapsed = list.classList.toggle('hidden');
        el.setAttribute('aria-expanded', String(!collapsed));
      });
    });
  }

  private renderBranch(node: MindMapNode, color: string): string {
    const label = escapeHtml(node.label);
    return `
      <li style="--branch: ${color}">
        <div class="flex min-h-11 items-center gap-3">
          <span class="size-2.5 shrink-0 rounded-full bg-[var(--branch)]" aria-hidden="true"></span>
          ${
            node.isLeaf()
              ? `<span class="break-words font-medium">${label}</span>`
              : `<button type="button" data-toggle aria-expanded="true" class="min-h-11 min-w-11 break-words text-left font-medium hover:underline">${label}</button>`
          }
        </div>
        ${node.isLeaf() ? '' : `<ul class="ml-1 flex flex-col gap-1.5 border-l-2 border-[var(--branch)] pl-4">${node.children.map((c) => this.renderLeaf(c)).join('')}</ul>`}
      </li>
    `;
  }

  private renderLeaf(node: MindMapNode): string {
    if (node.isLeaf()) {
      return `<li class="break-words text-sm leading-relaxed">${escapeHtml(node.label)}</li>`;
    }
    return `
      <li class="break-words">
        <div class="text-sm font-medium">${escapeHtml(node.label)}</div>
        <ul class="ml-4 mt-1 list-disc space-y-0.5 text-sm leading-relaxed">
          ${node.children.map((c) => `<li>${escapeHtml(c.label)}</li>`).join('')}
        </ul>
      </li>
    `;
  }
}
