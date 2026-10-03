import type { Meeting } from '../../domain/meeting/entities/Meeting';
import { meetingCost } from '../../domain/tokens/services/MeetingCost';
import { Money } from '../../domain/tokens/value-objects/Money';
import type { Translator } from '../i18n/Translator';
import { formatDuration } from '../util/formatDuration';
import { metaLine } from '../util/metaLine';
import { LLM_LABEL, TRANSCRIPTION_LABEL } from './providerLabels';

interface LiveNodes {
  readonly elapsed: Text;
  readonly cost: Text;
  readonly words: Text;
}

export class CostCounter {
  private interval: number | null = null;
  private live: LiveNodes | null = null;
  private words: { meeting: Meeting; segments: number; text: string; language: string } | null =
    null;

  startLive(target: HTMLElement, getMeeting: () => Meeting | null, translator: Translator): void {
    this.stop();
    const { elapsed, cost, words } = this.liveNodes(target);
    const tick = (): void => {
      const meeting = getMeeting();
      if (!meeting) return;
      elapsed.data = formatClock(meeting.durationMs);
      const [costText, wordsText] = this.liveCostText(meeting, translator);
      cost.data = costText;
      words.data = wordsText;
      if (words.parentElement) words.parentElement.hidden = wordsText === '';
    };
    tick();
    this.interval = window.setInterval(tick, 1000);
  }

  stop(): void {
    if (this.interval !== null) {
      window.clearInterval(this.interval);
      this.interval = null;
    }
  }

  /** One quiet line for a just-finished meeting: how long, how many words, what it cost. */
  renderSummaryLine(target: HTMLElement, meeting: Meeting, translator: Translator): void {
    this.stop();
    const { total } = meetingCost(meeting);
    target.innerHTML = `
      <p class="text-sm text-fg-muted tabular">${metaLine([
        formatDuration(meeting.durationMs / 1000, translator.language),
        wordCount(meeting, translator),
        `${translator.t('cost.total')} ${total.format(total.toUsd() >= 0.1 ? 2 : 3)}`,
      ])}</p>
    `;
  }

  /** What each provider charged, so people paying with their own keys can see where it went. */
  renderBreakdown(target: HTMLElement, meeting: Meeting, translator: Translator): void {
    this.stop();
    const { transcription, llm, mindMap, total } = meetingCost(meeting);
    const rows = [
      ...this.providerRows(transcription, TRANSCRIPTION_LABEL),
      ...this.providerRows(llm, LLM_LABEL),
      ...(mindMap.toUsd() > 0
        ? [costRow(translator.t('detail.cost_mind_map'), mindMap.format(3))]
        : []),
    ];
    target.innerHTML = `
      <dl class="flex flex-col divide-y divide-line">
        ${rows.join('')}
        ${costRow(translator.t('detail.cost_total'), total.format(3), 'font-semibold')}
      </dl>
    `;
  }

  private providerRows<K extends string>(
    costs: Map<K, Money>,
    labels: Record<K, string>,
  ): string[] {
    return [...costs.entries()]
      .filter(([, cost]) => cost.toUsd() > 0)
      .map(([provider, cost]) => costRow(labels[provider], cost.format(3)));
  }

  /** Built once per recording so each tick only rewrites two text nodes. */
  private liveNodes(target: HTMLElement): LiveNodes {
    if (!this.live || !target.contains(this.live.elapsed)) {
      const elapsedEl = document.createElement('p');
      elapsedEl.className =
        'text-[length:clamp(4rem,20vw,4.5rem)] leading-none font-semibold tracking-tight tabular';
      const costEl = document.createElement('p');
      costEl.className = 'meta-line mt-2 justify-center text-base text-fg-muted tabular';
      const elapsed = document.createTextNode('');
      const cost = document.createTextNode('');
      const words = document.createTextNode('');
      const costSpan = document.createElement('span');
      const wordsSpan = document.createElement('span');
      costSpan.append(cost);
      wordsSpan.append(words);
      elapsedEl.append(elapsed);
      costEl.append(costSpan, wordsSpan);
      target.replaceChildren(elapsedEl, costEl);
      this.live = { elapsed, cost, words };
    }
    return this.live;
  }

  private liveCostText(meeting: Meeting, translator: Translator): [string, string] {
    const transcribedMs = meeting.segments.reduce((sum, s) => sum + s.durationMs, 0);
    if (transcribedMs === 0) return [translator.t('home.chunks_wait'), ''];
    const soFar = sumAll(meetingCost(meeting).transcription.values());
    const amount = Math.round(soFar.toUsd() * 1000) > 0 ? soFar.format(3) : '—';
    return [translator.t('cost.so_far', { amount }), this.liveWordCount(meeting, translator)];
  }

  /** The tick runs every second; the transcript only changes when a part arrives. */
  private liveWordCount(meeting: Meeting, translator: Translator): string {
    const segments = meeting.segments.length;
    const cached = this.words;
    if (
      cached?.meeting === meeting &&
      cached.segments === segments &&
      cached.language === translator.language
    ) {
      return cached.text;
    }
    const text = wordCount(meeting, translator);
    this.words = { meeting, segments, text, language: translator.language };
    return text;
  }
}

const wordCount = (meeting: Meeting, translator: Translator): string => {
  const count = meeting.fullText().wordCount();
  return translator.t(count === 1 ? 'cost.words_one' : 'cost.words', { count });
};

const costRow = (label: string, amount: string, emphasis = ''): string => `
  <div class="flex items-baseline justify-between gap-4 py-2 first:pt-0 last:pb-0 ${emphasis}">
    <dt>${label}</dt>
    <dd class="tabular">${amount}</dd>
  </div>
`;

const sumAll = (values: Iterable<Money>): Money => {
  let total = Money.zero();
  for (const value of values) total = total.add(value);
  return total;
};

const formatClock = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number): string => String(n).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
};
