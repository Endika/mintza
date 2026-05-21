import type { Meeting } from '../../domain/meeting/entities/Meeting';
import type { LLMProviderName } from '../../domain/summary/value-objects/LLMProvider';
import { CostCalculator } from '../../domain/tokens/services/CostCalculator';
import { Money } from '../../domain/tokens/value-objects/Money';

const PROVIDER_DEFAULT_MODEL: Record<LLMProviderName, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-sonnet-4-5',
  gemini: 'gemini-2.0-flash',
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
    const whisper = this.calculator.whisperCost(meeting.durationMs);
    let llmTotal = Money.zero();
    const byProvider = new Map<LLMProviderName, Money>();
    for (const summary of meeting.summaries.values()) {
      const model = PROVIDER_DEFAULT_MODEL[summary.provider];
      const cost = this.calculator.llmCost(model, summary.tokensIn, summary.tokensOut);
      llmTotal = llmTotal.add(cost);
      byProvider.set(summary.provider, (byProvider.get(summary.provider) ?? Money.zero()).add(cost));
    }
    const total = whisper.add(llmTotal);
    target.innerHTML = `
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-600">
        <span><strong>Total:</strong> ${total.format()}</span>
        <span class="text-ink-400">Whisper ${whisper.format()}</span>
        ${Array.from(byProvider.entries())
          .map(
            ([provider, cost]) =>
              `<span class="text-ink-400">${labelFor(provider)} ${cost.format()}</span>`,
          )
          .join('')}
        <span class="text-ink-400">${formatDuration(meeting.durationMs)}</span>
        <span class="text-ink-400">${meeting.fullText().wordCount()} words</span>
      </div>
    `;
  }

  private renderLive(target: HTMLElement, meeting: Meeting): void {
    const whisper = this.calculator.whisperCost(meeting.durationMs);
    target.innerHTML = `
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-600">
        <span><strong>Recording…</strong></span>
        <span class="text-ink-400">${formatDuration(meeting.durationMs)}</span>
        <span class="text-ink-400">${meeting.fullText().wordCount()} words</span>
        <span class="text-ink-400">Whisper so far: ${whisper.format()}</span>
      </div>
    `;
  }
}

const formatDuration = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number): string => String(n).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
};

const labelFor = (provider: LLMProviderName): string => {
  switch (provider) {
    case 'openai':
      return 'GPT';
    case 'anthropic':
      return 'Claude';
    case 'gemini':
      return 'Gemini';
  }
};
