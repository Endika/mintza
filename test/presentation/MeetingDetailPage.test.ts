import { afterEach, describe, expect, it } from 'vitest';
import { DeleteMeetingUseCase } from '../../src/application/use-cases/DeleteMeetingUseCase';
import { GetMeetingUseCase } from '../../src/application/use-cases/GetMeetingUseCase';
import { ListTemplatesUseCase } from '../../src/application/use-cases/ListTemplatesUseCase';
import { RegenerateSummariesUseCase } from '../../src/application/use-cases/RegenerateSummariesUseCase';
import { TemplateRegistry } from '../../src/domain/meeting/services/TemplateRegistry';
import { MeetingId } from '../../src/domain/meeting/value-objects/MeetingId';
import { TemperatureScore } from '../../src/domain/temperature/value-objects/TemperatureScore';
import { LocalStorageTemplateRepository } from '../../src/infrastructure/persistence/LocalStorageTemplateRepository';
import { Translator } from '../../src/presentation/i18n/Translator';
import { MeetingDetailPage } from '../../src/presentation/pages/MeetingDetailPage';
import { FakeSummarizationPort } from '../fakes/FakeSummarizationPort';
import { InMemoryMeetingRepository } from '../fakes/InMemoryMeetingRepository';
import { finishedMeeting } from './meetingFixtures';

const renderDetail = async (repo: InMemoryMeetingRepository, id: string): Promise<HTMLElement> => {
  window.localStorage.clear();
  window.location.hash = `#/meeting?id=${id}`;
  const page = new MeetingDetailPage({
    getMeeting: new GetMeetingUseCase(repo),
    deleteMeeting: new DeleteMeetingUseCase(repo),
    listTemplates: new ListTemplatesUseCase(
      new TemplateRegistry(new LocalStorageTemplateRepository(window.localStorage)),
    ),
    regenerateSummaries: new RegenerateSummariesUseCase(
      new FakeSummarizationPort({ kind: 'success', content: 'x' }),
      repo,
    ),
    translator: new Translator('en'),
  });
  const root = document.createElement('div');
  document.body.appendChild(root);
  await page.render(root);
  return root;
};

afterEach(() => {
  document.body.innerHTML = '';
  window.location.hash = '';
});

describe('MeetingDetailPage', () => {
  it("leads with the template's main result and folds the rest away", async () => {
    const repo = new InMemoryMeetingRepository();
    const meeting = finishedMeeting({
      title: 'Roadmap sync',
      seconds: 1834,
      summaries: {
        bullet_points: '- shipped the beta',
        decisions: '# Agreed\n- launch on Monday',
        action_items: '- Ana books the room',
      },
    });
    await repo.save(meeting);
    const root = await renderDetail(repo, meeting.id.value);

    expect(root.querySelectorAll('h1')).toHaveLength(1);
    expect(root.querySelector('h1')?.textContent).toBe('Roadmap sync');
    const primary = root.querySelector('#primary-summary')!;
    expect(primary.getAttribute('data-kind')).toBe('decisions');
    expect(primary.querySelector('h2')?.textContent).toBe('Decisions');
    expect(primary.querySelector('h3')?.textContent).toBe('Agreed');
    const folded = [...root.querySelectorAll('details[data-kind]')].map((d) =>
      d.getAttribute('data-kind'),
    );
    expect(folded).toEqual(['action_items', 'bullet_points']);
    expect(primary.compareDocumentPosition(root.querySelector('details[data-kind]')!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(root.querySelector('#btn-delete')).not.toBeNull();
    expect(root.querySelector('label[for="regen-template"]')?.textContent).toBe('Regenerate with');
  });

  it('shows the sentiment as the gauge, not as a text result', async () => {
    const repo = new InMemoryMeetingRepository();
    const meeting = finishedMeeting({
      title: 'Retro',
      seconds: 600,
      summaries: { decisions: '- keep the format', sentiment: 'Score: 72' },
    });
    meeting.setTemperature(TemperatureScore.of(72));
    await repo.save(meeting);
    const root = await renderDetail(repo, meeting.id.value);

    expect(root.querySelector('[data-kind="sentiment"]')).toBeNull();
    const gauge = root.querySelector('[role="progressbar"]')!;
    expect(gauge.getAttribute('aria-label')).toBe('Overall tone');
    expect(gauge.getAttribute('aria-valuetext')).toBe('Positive');
  });

  it('explains a missing meeting and offers no Delete', async () => {
    const root = await renderDetail(new InMemoryMeetingRepository(), MeetingId.generate().value);

    expect(root.querySelector('h1')?.textContent).toBe(
      "This meeting doesn't exist or was deleted.",
    );
    expect(root.querySelector('a[href="#/history"]')?.textContent).toContain('Back to History');
    expect(root.querySelector('#btn-delete')).toBeNull();
    expect(root.textContent).not.toContain('Delete');
  });
});
