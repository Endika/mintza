import type { Meeting } from '../../domain/meeting/entities/Meeting';
import { StatisticsCalculator } from '../../domain/statistics/services/StatisticsCalculator';
import type { Translator } from '../i18n/Translator';
import { escapeHtml } from '../util/escapeHtml';
import { formatDuration } from '../util/formatDuration';
import { transcriptionLabel } from './providerLabels';

export class StatisticsPanel {
  private readonly calculator = new StatisticsCalculator();

  render(target: HTMLElement, meeting: Meeting, translator: Translator): void {
    const stats = this.calculator.calculate(meeting);
    const number = new Intl.NumberFormat(translator.language);
    target.innerHTML = `
      <dl class="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
        ${stat(translator.t('stats.duration'), formatDuration(stats.durationMs / 1000, translator.language))}
        ${stat(translator.t('stats.words'), number.format(stats.wordCount))}
        ${stat(translator.t('stats.words_per_minute'), number.format(stats.wordsPerMinute))}
        ${stat(translator.t('stats.providers'), escapeHtml(stats.providersUsed.map(transcriptionLabel).join(', ') || '—'))}
      </dl>
      <h4 class="mt-5 mb-2 text-sm font-medium text-fg-muted">${translator.t('stats.top_keywords')}</h4>
      ${
        stats.topKeywords.length === 0
          ? `<p class="text-sm text-fg-muted">${translator.t('stats.no_keywords')}</p>`
          : `<ul class="flex flex-wrap gap-2">${stats.topKeywords
              .map(
                (k) =>
                  `<li class="inline-flex items-center gap-1.5 rounded-full bg-raised px-3 py-1 text-sm">${escapeHtml(k.term)}<span class="text-fg-muted tabular">${k.count}</span></li>`,
              )
              .join('')}</ul>`
      }
    `;
  }
}

const stat = (label: string, value: string): string => `
  <div class="min-w-0">
    <dt class="text-sm text-fg-muted">${label}</dt>
    <dd class="mt-0.5 break-words text-lg font-semibold tabular">${value}</dd>
  </div>
`;
