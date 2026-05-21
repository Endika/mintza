import type { Meeting } from '../../domain/meeting/entities/Meeting';
import type { LLMProviderName } from '../../domain/summary/value-objects/LLMProvider';
import { CostCalculator } from '../../domain/tokens/services/CostCalculator';
import { Money } from '../../domain/tokens/value-objects/Money';
import type { TranscriptionProviderName } from '../../domain/transcription/value-objects/TranscriptionProvider';

const LLM_DEFAULT_MODEL: Record<LLMProviderName, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-sonnet-4-5',
  gemini: 'gemini-2.0-flash',
};

const TRANSCRIPTION_LABEL: Record<TranscriptionProviderName, string> = {
  whisper: 'Whisper',
  google: 'Google Speech',
  azure: 'Azure Speech',
  webspeech: 'Web Speech',
};

const LLM_LABEL: Record<LLMProviderName, string> = {
  openai: 'GPT',
  anthropic: 'Claude',
  gemini: 'Gemini',
};

export class CostCounter {
  private readonly calculator = new CostCalculator();
  private interval: number | null = null;

  startLive(target: HTMLElement, getMeeting: () => Meeting | null): void {
    this.stop();
    const tick = (): void => {
      const meeting = getMeeting();
      if (!meeting) return;
      this.renderLive(target, meeting);
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

  renderFinal(target: HTMLElement, meeting: Meeting): void {
    this.stop();
    const transcription = this.transcriptionByProvider(meeting);
    const llm = this.llmByProvider(meeting);
    const total = sumAll([...transcription.values(), ...llm.values()]);

    target.innerHTML = `
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-600">
        <span><strong>Total:</strong> ${total.format()}</span>
        ${this.providerSpans(transcription, TRANSCRIPTION_LABEL)}
        ${this.providerSpans(llm, LLM_LABEL)}
        <span class="text-ink-400">${formatDuration(meeting.durationMs)}</span>
        <span class="text-ink-400">${meeting.fullText().wordCount()} words</span>
      </div>
    `;
  }

  private renderLive(target: HTMLElement, meeting: Meeting): void {
    const transcription = this.transcriptionByProvider(meeting);
    const transcribedMs = meeting.segments.reduce((sum, s) => sum + s.durationMs, 0);
    const totalSoFar = sumAll([...transcription.values()]);
    const providerSpans = this.providerSpans(transcription, TRANSCRIPTION_LABEL);
    target.innerHTML = `
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-600">
        <span><strong>Recording…</strong></span>
        <span class="text-ink-400">${formatDuration(meeting.durationMs)}</span>
        <span class="text-ink-400">${meeting.fullText().wordCount()} words</span>
        ${
          transcribedMs > 0
            ? `<span class="text-ink-400">Transcribed ${formatDuration(transcribedMs)}</span>
               <span class="text-ink-400">Cost so far: ${totalSoFar.format()}</span>
               ${providerSpans}`
            : '<span class="text-ink-400">Waiting for first chunk…</span>'
        }
      </div>
    `;
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

  private providerSpans<K extends string>(
    costs: Map<K, Money>,
    labels: Record<K, string>,
  ): string {
    return [...costs.entries()]
      .filter(([, cost]) => cost.toUsd() > 0)
      .map(
        ([provider, cost]) =>
          `<span class="text-ink-400">${labels[provider]} ${cost.format()}</span>`,
      )
      .join('');
  }
}

const sumAll = (values: Iterable<Money>): Money => {
  let total = Money.zero();
  for (const value of values) total = total.add(value);
  return total;
};

const formatDuration = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number): string => String(n).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
};
