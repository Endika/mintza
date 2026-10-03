import { afterEach, describe, expect, it } from 'vitest';
import { defaultMeetingTitle } from '../../src/domain/meeting/entities/Meeting';
import { PdfExporter } from '../../src/infrastructure/export/PdfExporter';
import { ExportMenu } from '../../src/presentation/components/ExportMenu';
import { Translator } from '../../src/presentation/i18n/Translator';
import { finishedMeeting, settle } from './meetingFixtures';

const startedAt = new Date('2026-09-30T10:00:00Z');

const downloadName = async (format: string, language: 'en' | 'es'): Promise<string> => {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const meeting = finishedMeeting({
    title: defaultMeetingTitle(startedAt),
    seconds: 60,
    transcript: 'hello team',
  });
  const menu = new ExportMenu();
  menu.render(target, () => meeting, new Translator(language));
  let name = '';
  const listening = new AbortController();
  document.addEventListener(
    'click',
    (e) => {
      if (e.target instanceof HTMLAnchorElement && e.target.download) name = e.target.download;
    },
    { signal: listening.signal },
  );
  target.querySelector<HTMLButtonElement>(`[data-export="${format}"]`)!.click();
  for (let i = 0; i < 20 && name === ''; i++) await settle();
  menu.dispose();
  listening.abort();
  return name;
};

describe('Exports use the title people see', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('names an untitled meeting in the interface language', async () => {
    expect(await downloadName('markdown', 'es')).toMatch(/^reunion-30-sept?-\d{2}-00\.md$/);
    expect(await downloadName('txt', 'en')).toMatch(/^meeting-30-sept?-\d{2}-00\.txt$/);
  });

  it('names the PDF the same way', async () => {
    expect(await downloadName('pdf', 'es')).toMatch(/^reunion-30-sept?-\d{2}-00\.pdf$/);
  });

  it('prints the given title in the PDF instead of the stored one', async () => {
    const meeting = finishedMeeting({ title: 'stored-title', seconds: 60, transcript: 'hello' });
    const blob = await new PdfExporter().generate(meeting, 'Weekly sync');
    const text = await blob.text();
    expect(text).toContain('Weekly sync');
    expect(text).not.toContain('stored-title');
  });
});
