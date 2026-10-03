import { describe, expect, it } from 'vitest';
import { Language } from '../../src/domain/language/value-objects/Language';
import { Meeting } from '../../src/domain/meeting/entities/Meeting';
import { Template } from '../../src/domain/meeting/value-objects/Template';
import { Translator } from '../../src/presentation/i18n/Translator';
import { meetingTitle } from '../../src/presentation/util/meetingTitle';

const startedAt = new Date(2026, 9, 3, 15, 37);
const fresh = (title?: string): Meeting =>
  Meeting.start({
    template: Template.work(),
    language: Language.of('en'),
    now: startedAt,
    ...(title ? { title } : {}),
  });

describe('meetingTitle', () => {
  it('names an untitled meeting in the interface language with its local date and time', () => {
    const meeting = fresh();
    expect(meetingTitle(meeting, new Translator('en'))).toBe('Meeting · 3 Oct, 15:37');
    expect(meetingTitle(meeting, new Translator('es'))).toBe('Reunión · 3 oct, 15:37');
    expect(meetingTitle(meeting, new Translator('eu'))).toBe('Bilera · urr. 3, 15:37');
  });

  it('keeps a title someone chose', () => {
    expect(meetingTitle(fresh('Budget review'), new Translator('es'))).toBe('Budget review');
  });
});
