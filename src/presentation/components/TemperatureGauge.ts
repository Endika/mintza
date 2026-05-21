import type {
  TemperatureBand,
  TemperatureScore,
} from '../../domain/temperature/value-objects/TemperatureScore';

const BAND_COLORS: Record<TemperatureBand, string> = {
  very_negative: '#7f1d1d',
  negative: '#ea580c',
  neutral: '#eab308',
  positive: '#16a34a',
  very_positive: '#6366F1',
};

const BAND_LABELS: Record<TemperatureBand, string> = {
  very_negative: 'Very negative',
  negative: 'Negative',
  neutral: 'Neutral',
  positive: 'Positive',
  very_positive: 'Very positive',
};

const BAND_EMOJI: Record<TemperatureBand, string> = {
  very_negative: '🥶',
  negative: '😕',
  neutral: '😐',
  positive: '🙂',
  very_positive: '🔥',
};

export class TemperatureGauge {
  render(target: HTMLElement, score: TemperatureScore): void {
    const band = score.band();
    const color = BAND_COLORS[band];
    const percent = Math.round(score.value);
    target.innerHTML = `
      <div class="flex items-center gap-4">
        <div class="text-4xl" aria-hidden="true">${BAND_EMOJI[band]}</div>
        <div class="flex-1">
          <div class="flex items-baseline justify-between">
            <span class="text-3xl font-bold tabular-nums" style="color:${color}">${percent}</span>
            <span class="text-sm font-medium" style="color:${color}">${BAND_LABELS[band]}</span>
          </div>
          <div class="mt-2 h-2 rounded-full bg-ink-100 overflow-hidden">
            <div
              role="progressbar"
              aria-valuenow="${percent}"
              aria-valuemin="0"
              aria-valuemax="100"
              class="h-full rounded-full transition-all duration-500 ease-smooth"
              style="width:${percent}%; background: linear-gradient(90deg, #7f1d1d, #ea580c, #eab308, #16a34a, #6366F1)"
            ></div>
          </div>
        </div>
      </div>
    `;
  }
}
