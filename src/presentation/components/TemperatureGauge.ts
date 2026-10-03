import type {
  TemperatureBand,
  TemperatureScore,
} from '../../domain/temperature/value-objects/TemperatureScore';
import type { TranslationKey } from '../i18n/translations';
import type { Translator } from '../i18n/Translator';
import { escapeHtml } from '../util/escapeHtml';

// The action green belongs to pressables and red to recording, so only a low tone takes a colour.
const BAND_TEXT: Record<TemperatureBand, string> = {
  very_negative: 'text-warning',
  negative: 'text-warning',
  neutral: 'text-fg',
  positive: 'text-fg',
  very_positive: 'text-fg',
};

const BAND_LABEL_KEYS: Record<TemperatureBand, TranslationKey> = {
  very_negative: 'sentiment.very_negative',
  negative: 'sentiment.negative',
  neutral: 'sentiment.neutral',
  positive: 'sentiment.positive',
  very_positive: 'sentiment.very_positive',
};

const BAND_SENTENCE_KEYS: Record<TemperatureBand, TranslationKey> = {
  very_negative: 'sentiment.sentence_very_negative',
  negative: 'sentiment.sentence_negative',
  neutral: 'sentiment.sentence_neutral',
  positive: 'sentiment.sentence_positive',
  very_positive: 'sentiment.sentence_very_positive',
};

export class TemperatureGauge {
  render(target: HTMLElement, score: TemperatureScore, translator: Translator): void {
    const band = score.band();
    const label = escapeHtml(translator.t(BAND_LABEL_KEYS[band]));
    const percent = Math.round(score.value);
    target.innerHTML = `
      <p class="text-lg font-semibold ${BAND_TEXT[band]}">${label}</p>
      <p class="mt-1 leading-relaxed text-fg-muted">${escapeHtml(translator.t(BAND_SENTENCE_KEYS[band]))}</p>
      <div class="meter-bar-track mt-4">
        <div
          role="progressbar"
          aria-label="${escapeHtml(translator.t('sentiment.overall'))}"
          aria-valuenow="${percent}"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuetext="${label}"
          class="meter-bar-fill bg-fg-muted"
          style="width:${percent}%"
        ></div>
      </div>
    `;
  }
}
