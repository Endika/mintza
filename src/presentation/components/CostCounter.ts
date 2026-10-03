import type { Meeting } from '../../domain/meeting/entities/Meeting';
import { meetingCost } from '../../domain/tokens/services/MeetingCost';
import { Money } from '../../domain/tokens/value-objects/Money';
import type { Translator } from '../i18n/Translator';
import { formatDuration } from '../util/formatDuration';
import { LLM_LABEL, TRANSCRIPTION_LABEL } from './providerLabels';

export class CostCounter {
  private interval: number | null = null;
  private live: { elapsed: Text; cost: Text } | null = null;

  startLive(target: HTMLElement, getMeeting: () => Meeting | null, translator: Translator): void {
    this.stop();
    const { elapsed, cost } = this.liveNodes(target);
    const tick = (): void => {
      const meeting = getMeeting();
      if (!meeting) return;
      elapsed.data = formatClock(meeting.durationMs);
      cost.data = this.liveCostText(meeting, translator);
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
      <p class="flex flex-wrap gap-x-2 text-sm text-fg-muted">
        <span class="tabular">${formatDuration(meeting.durationMs / 1000, translator.language)}</span><span aria-hidden="true">·</span>
        <span>${translator.t('cost.words', { count: meeting.fullText().wordCount() })}</span><span aria-hidden="true">·</span>
        <span class="tabular">${translator.t('cost.total')} ${total.format(total.toUsd() >= 0.1 ? 2 : 3)}</span>
      </p>
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
  private liveNodes(target: HTMLElement): { elapsed: Text; cost: Text } {
    if (!this.live || !target.contains(this.live.elapsed)) {
      const elapsedEl = document.createElement('p');
      elapsedEl.className = 'text-6xl font-semibold tracking-tight tabular sm:text-7xl';
      const costEl = document.createElement('p');
      costEl.className = 'mt-2 text-base text-fg-muted tabular';
      const elapsed = document.createTextNode('');
      const cost = document.createTextNode('');
      elapsedEl.append(elapsed);
      costEl.append(cost);
      target.replaceChildren(elapsedEl, costEl);
      this.live = { elapsed, cost };
    }
    return this.live;
  }

  private liveCostText(meeting: Meeting, translator: Translator): string {
    const transcribedMs = meeting.segments.reduce((sum, s) => sum + s.durationMs, 0);
    if (transcribedMs === 0) return translator.t('home.chunks_wait');
    const soFar = sumAll(meetingCost(meeting).transcription.values());
    return `${translator.t('cost.so_far', { amount: soFar.format(3) })} · ${translator.t('cost.words', { count: meeting.fullText().wordCount() })}`;
  }
}

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
