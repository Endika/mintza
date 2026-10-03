import { ICON_CHEVRON } from './icons';

export interface DisclosureRow {
  readonly id: string;
  readonly kind: string;
  /** Already escaped. */
  readonly label: string;
  readonly bodyHtml: string;
  readonly expanded?: boolean;
}

/** VoiceOver flattens a heading inside <summary>, so the heading holds the button instead. */
export const disclosureHtml = ({
  id,
  kind,
  label,
  bodyHtml,
  expanded = false,
}: DisclosureRow): string => `
  <div data-kind="${kind}">
    <h3 class="text-base font-semibold">
      <button type="button" id="${id}-toggle" class="group flex min-h-14 w-full items-center justify-between gap-3 px-5 py-3 text-left sm:px-6" aria-expanded="${expanded}" aria-controls="${id}" data-disclosure>
        <span>${label}</span>
        <span class="shrink-0 text-fg-muted transition-transform duration-150 group-aria-expanded:rotate-90">${ICON_CHEVRON}</span>
      </button>
    </h3>
    <div id="${id}" role="region" aria-labelledby="${id}-toggle" class="prose-summary px-5 pb-5 leading-relaxed sm:px-6"${expanded ? '' : ' hidden'}>${bodyHtml}</div>
  </div>`;

/** Delegated, so rows rendered again later into the same container keep working. */
export const bindDisclosures = (container: HTMLElement): void => {
  container.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const toggle = target.closest<HTMLButtonElement>('[data-disclosure]');
    if (!toggle || !container.contains(toggle)) return;
    const expanded = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(expanded));
    const region = container.querySelector<HTMLElement>(`#${toggle.getAttribute('aria-controls')}`);
    if (region) region.hidden = !expanded;
  });
};
