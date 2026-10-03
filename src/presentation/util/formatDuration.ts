import type { LanguageCode } from '../../domain/language/value-objects/Language';

// "h", "min" and "s" read the same in en, es and eu, so the units need no translation key.
export const formatDuration = (seconds: number, lang: LanguageCode): string => {
  const total = Math.max(0, Math.floor(seconds));
  const plain = new Intl.NumberFormat(lang, { useGrouping: false });
  const padded = new Intl.NumberFormat(lang, { minimumIntegerDigits: 2, useGrouping: false });
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) return `${plain.format(hours)} h ${padded.format(minutes)} min`;
  if (minutes > 0) return `${plain.format(minutes)} min ${padded.format(secs)} s`;
  return `${plain.format(secs)} s`;
};
