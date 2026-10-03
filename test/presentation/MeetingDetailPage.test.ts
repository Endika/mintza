import { afterEach, describe, expect, it } from 'vitest';
import { DeleteMeetingUseCase } from '../../src/application/use-cases/DeleteMeetingUseCase';
import { GetMeetingUseCase } from '../../src/application/use-cases/GetMeetingUseCase';
import { ListTemplatesUseCase } from '../../src/application/use-cases/ListTemplatesUseCase';
import { RegenerateSummariesUseCase } from '../../src/application/use-cases/RegenerateSummariesUseCase';
import { TemplateRegistry } from '../../src/domain/meeting/services/TemplateRegistry';
import { MeetingId } from '../../src/domain/meeting/value-objects/MeetingId';
import { MindMap } from '../../src/domain/mindmap/entities/MindMap';
import { MindMapNode } from '../../src/domain/mindmap/value-objects/MindMapNode';
import { Summary } from '../../src/domain/summary/entities/Summary';
import { TemperatureScore } from '../../src/domain/temperature/value-objects/TemperatureScore';
import { TokenCount } from '../../src/domain/tokens/value-objects/TokenCount';
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

  it('breaks the cost down by provider for people paying with their own keys', async () => {
    const repo = new InMemoryMeetingRepository();
    const meeting = finishedMeeting({
      title: 'Budget review',
      seconds: 600,
      transcript: 'We kept the budget flat.',
      summaries: { decisions: '- keep it flat' },
    });
    await repo.save(meeting);
    const root = await renderDetail(repo, meeting.id.value);

    const rows = [...root.querySelectorAll('#detail-cost dt')].map((dt) => dt.textContent);
    expect(rows).toEqual(['Whisper', 'GPT', 'Total']);
    expect(root.querySelector('#detail-cost')?.textContent).toContain('$0.060');
    expect(root.querySelector('header')?.textContent).toContain('English');
  });

  it('prices a premium summary at its own model and counts the mind map', async () => {
    const repo = new InMemoryMeetingRepository();
    const meeting = finishedMeeting({ title: 'Premium', seconds: 60 });
    meeting.setSummary(
      new Summary({
        kind: 'decisions',
        content: '- ship',
        tokensIn: TokenCount.of(1_000_000),
        tokensOut: TokenCount.zero(),
        provider: 'openai',
        model: 'gpt-4o',
        generatedAt: new Date('2026-09-30T10:01:00Z'),
      }),
    );
    meeting.setMindMap(
      new MindMap(new MindMapNode('root', []), {
        model: 'gpt-4o-mini',
        tokensIn: TokenCount.of(1_000_000),
        tokensOut: TokenCount.zero(),
      }),
    );
    await repo.save(meeting);
    const root = await renderDetail(repo, meeting.id.value);

    const rows = [...root.querySelectorAll('#detail-cost div')].map((row) => [
      row.querySelector('dt')?.textContent,
      row.querySelector('dd')?.textContent,
    ]);
    expect(rows).toEqual([
      ['GPT', '$5.000'],
      ['Mind map', '$0.150'],
      ['Total', '$5.150'],
    ]);
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
