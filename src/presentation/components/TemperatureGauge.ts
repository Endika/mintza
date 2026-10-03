import type {
  TemperatureBand,
  TemperatureScore,
} from '../../domain/temperature/value-objects/TemperatureScore';
import type { TranslationKey } from '../i18n/translations';
import type { Translator } from '../i18n/Translator';
import { escapeHtml } from '../util/escapeHtml';

const BAND_TEXT: Record<TemperatureBand, string> = {
  very_negative: 'text-warning',
  negative: 'text-warning',
  neutral: 'text-fg-muted',
  positive: 'text-success',
  very_positive: 'text-success',
};

const BAND_LABEL_KEYS: Record<TemperatureBand, TranslationKey> = {
  very_negative: 'sentiment.very_negative',
  negative: 'sentiment.negative',
  neutral: 'sentiment.neutral',
  positive: 'sentiment.positive',
  very_positive: 'sentiment.very_positive',
};

// Red stays reserved for recording and destructive actions, so a low score reads as amber.
const SCALE =
  'linear-gradient(90deg, var(--color-warning), var(--color-fg-muted), var(--color-success))';

export class TemperatureGauge {
  render(target: HTMLElement, score: TemperatureScore, translator: Translator): void {
    const band = score.band();
    const label = escapeHtml(translator.t(BAND_LABEL_KEYS[band]));
    const percent = Math.round(score.value);
    // Stretching the gradient to the full track keeps each colour at its place on the 0–100 scale.
    const size = percent > 0 ? (100 / percent) * 100 : 100;
    target.innerHTML = `
      <div class="flex items-baseline justify-between gap-3 ${BAND_TEXT[band]}">
        <span class="text-4xl font-semibold tracking-tight tabular">${percent}</span>
        <span class="font-semibold">${label}</span>
      </div>
      <div class="meter-bar-track mt-3">
        <div
          role="progressbar"
          aria-label="${escapeHtml(translator.t('sentiment.overall'))}"
          aria-valuenow="${percent}"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuetext="${label}"
          class="meter-bar-fill"
          style="width:${percent}%; background-image:${SCALE}; background-size:${size}% 100%"
        ></div>
      </div>
    `;
  }
}
