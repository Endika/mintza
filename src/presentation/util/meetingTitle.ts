import { defaultMeetingTitle } from '../../domain/meeting/entities/Meeting';
import type { LanguageCode } from '../../domain/language/value-objects/Language';
import type { Translator } from '../i18n/Translator';

// en-GB keeps "3 Oct, 15:37" in the same day-first, 24-hour order as es and eu.
const LOCALES: Record<LanguageCode, string> = { en: 'en-GB', es: 'es', eu: 'eu' };

const shortWhen = (date: Date, language: LanguageCode): string => {
  const locale = LOCALES[language];
  // Basque CLDR adds "(a)" to the day; only the day and month themselves are kept.
  const day = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' })
    .formatToParts(date)
    .filter((part) => part.type === 'day' || part.type === 'month')
    .map((part) => part.value)
    .join(' ');
  const time = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
  return `${day}, ${time}`;
};

export const meetingTitle = (
  meeting: { readonly title: string; readonly startedAt: Date },
  t: Translator,
): string =>
  meeting.title === defaultMeetingTitle(meeting.startedAt)
    ? `${t.t('meeting.default_title')} · ${shortWhen(meeting.startedAt, t.language)}`
    : meeting.title;
