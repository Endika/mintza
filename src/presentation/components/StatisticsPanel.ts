import type { Meeting } from '../../domain/meeting/entities/Meeting';
import { StatisticsCalculator } from '../../domain/statistics/services/StatisticsCalculator';

export class StatisticsPanel {
  private readonly calculator = new StatisticsCalculator();

  render(target: HTMLElement, meeting: Meeting): void {
    const stats = this.calculator.calculate(meeting);
    target.innerHTML = `
      <dl class="grid grid-cols-2 gap-4 md:grid-cols-4">
        ${stat('Duration', formatDuration(stats.durationMs))}
        ${stat('Words', String(stats.wordCount))}
        ${stat('Words / min', String(stats.wordsPerMinute))}
        ${stat('Providers', stats.providersUsed.join(', ') || '—')}
      </dl>
      <div class="mt-4">
        <h4 class="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-1">Top keywords</h4>
        <div class="flex flex-wrap gap-2">
          ${
            stats.topKeywords.length === 0
              ? '<em class="text-sm text-ink-400">No keywords detected.</em>'
              : stats.topKeywords
                  .map(
                    (k) =>
                      `<span class="rounded-full bg-ink-50 px-3 py-0.5 text-xs">${escape(k.term)} · ${k.count}</span>`,
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
    <dt class="text-xs font-semibold uppercase tracking-wide text-ink-400">${label}</dt>
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

const escape = (raw: string): string =>
  raw.replace(/[&<>"]/g, (ch) =>
    ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : '&quot;',
  );
