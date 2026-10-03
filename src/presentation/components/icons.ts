const icon = (paths: string, size = 24): string =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;

export const ICON_RECORD = icon(
  '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
);
export const ICON_HISTORY = icon(
  '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
);
export const ICON_SETTINGS = icon(
  '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
);
export const ICON_BACK = icon('<path d="M15 6l-6 6 6 6"/>', 20);
export const ICON_STOP = icon('<rect x="6" y="6" width="12" height="12" rx="2"/>', 20);
export const ICON_PAUSE = icon('<path d="M9 5v14M15 5v14"/>', 20);
export const ICON_PLAY = icon('<path d="M7 5l12 7-12 7z"/>', 20);
export const ICON_CHECK = icon('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 20);
export const ICON_ALERT = icon('<path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17.5h0"/>', 20);
export const ICON_KEY = icon(
  '<circle cx="8" cy="15" r="4"/><path d="M10.8 12.2L20 3M16 7l3 3M14 9l2 2"/>',
  20,
);
