import type { Meeting } from '../../domain/meeting/entities/Meeting';
import type { LLMProviderName } from '../../domain/summary/value-objects/LLMProvider';
import { CostCalculator } from '../../domain/tokens/services/CostCalculator';
import { Money } from '../../domain/tokens/value-objects/Money';
import type { TranscriptionProviderName } from '../../domain/transcription/value-objects/TranscriptionProvider';
import type { Translator } from '../i18n/Translator';
import { formatDuration } from '../util/formatDuration';

const LLM_DEFAULT_MODEL: Record<LLMProviderName, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-sonnet-4-5',
  gemini: 'gemini-2.0-flash',
};

export class CostCounter {
  private readonly calculator = new CostCalculator();
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
    const total = sumAll([
      ...this.transcriptionByProvider(meeting).values(),
      ...this.llmByProvider(meeting).values(),
    ]);
    target.innerHTML = `
      <p class="flex flex-wrap gap-x-2 text-sm text-fg-muted">
        <span class="tabular">${formatDuration(meeting.durationMs / 1000, translator.language)}</span><span aria-hidden="true">·</span>
        <span>${translator.t('cost.words', { count: meeting.fullText().wordCount() })}</span><span aria-hidden="true">·</span>
        <span class="tabular">${translator.t('cost.total')} ${total.format(total.toUsd() >= 0.1 ? 2 : 3)}</span>
      </p>
    `;
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
    const soFar = sumAll(this.transcriptionByProvider(meeting).values());
    return `${translator.t('cost.so_far', { amount: soFar.format(3) })} · ${translator.t('cost.words', { count: meeting.fullText().wordCount() })}`;
  }

  private transcriptionByProvider(meeting: Meeting): Map<TranscriptionProviderName, Money> {
    const result = new Map<TranscriptionProviderName, Money>();
    for (const segment of meeting.segments) {
      const cost = this.calculator.transcriptionCost(segment.provider, segment.durationMs);
      result.set(segment.provider, (result.get(segment.provider) ?? Money.zero()).add(cost));
    }
    return result;
  }

  private llmByProvider(meeting: Meeting): Map<LLMProviderName, Money> {
    const result = new Map<LLMProviderName, Money>();
    for (const summary of meeting.summaries.values()) {
      const model = LLM_DEFAULT_MODEL[summary.provider];
      const cost = this.calculator.llmCost(model, summary.tokensIn, summary.tokensOut);
      result.set(summary.provider, (result.get(summary.provider) ?? Money.zero()).add(cost));
    }
    return result;
  }
}

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
