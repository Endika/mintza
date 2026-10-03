import type { Meeting } from '../../domain/meeting/entities/Meeting';
import { StatisticsCalculator } from '../../domain/statistics/services/StatisticsCalculator';
import type { Translator } from '../i18n/Translator';
import { escapeHtml } from '../util/escapeHtml';

export class StatisticsPanel {
  private readonly calculator = new StatisticsCalculator();

  render(target: HTMLElement, meeting: Meeting, translator: Translator): void {
    const stats = this.calculator.calculate(meeting);
    target.innerHTML = `
      <dl class="grid grid-cols-2 gap-4 md:grid-cols-4">
        ${stat(translator.t('stats.duration'), formatDuration(stats.durationMs))}
        ${stat(translator.t('stats.words'), String(stats.wordCount))}
        ${stat(translator.t('stats.words_per_minute'), String(stats.wordsPerMinute))}
        ${stat(translator.t('stats.providers'), stats.providersUsed.join(', ') || '—')}
      </dl>
      <div class="mt-4">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-fg-muted mb-1">${translator.t('stats.top_keywords')}</h3>
        <div class="flex flex-wrap gap-2">
          ${
            stats.topKeywords.length === 0
              ? `<em class="text-sm text-fg-muted">${translator.t('stats.no_keywords')}</em>`
              : stats.topKeywords
                  .map(
                    (k) =>
                      `<span class="rounded-full bg-raised px-3 py-0.5 text-xs">${escapeHtml(k.term)} · ${k.count}</span>`,
                  )
                  .join('')
          }
        </div>
      </div>
    `;
  }
}

const stat = (label: string, value: string): string => `
  <div>
    <dt class="text-xs font-semibold uppercase tracking-wide text-fg-muted">${label}</dt>
    <dd class="mt-1 text-lg font-medium">${value}</dd>
  </div>
`;

const formatDuration = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number): string => String(n).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
};
