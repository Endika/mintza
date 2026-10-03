import type { Translator } from '../i18n/Translator';
import type { TranslationKey } from '../i18n/translations';

const SMOOTHING = 0.3;

type Band = 'none' | 'silent' | 'quiet' | 'ok' | 'loud';

const BAND_KEYS: Record<Band, TranslationKey> = {
  none: 'home.mic_none',
  silent: 'home.mic_silent',
  quiet: 'home.mic_quiet',
  ok: 'home.mic_ok',
  loud: 'home.mic_loud',
};

const bandFor = (percent: number, silentTicks: number): Band => {
  if (silentTicks > 60) return 'none';
  if (percent < 4) return 'silent';
  if (percent < 25) return 'quiet';
  if (percent < 65) return 'ok';
  return 'loud';
};

export class AudioLevelMeter {
  private context: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private rafId: number | null = null;
  private smoothed = 0;
  private silentTicks = 0;

  start(target: HTMLElement, stream: MediaStream, translator: Translator): void {
    this.stop();
    target.innerHTML = `
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span class="shrink-0 text-sm text-fg-muted">${translator.t('home.mic_level')}</span>
        <div class="meter-bar-track min-w-0 flex-1">
          <div data-bar class="meter-bar-fill bg-live" style="width:0%"></div>
        </div>
        <span data-hint class="basis-full text-sm text-fg-muted sm:basis-auto sm:shrink-0"></span>
      </div>
    `;
    const bar = target.querySelector<HTMLElement>('[data-bar]');
    const hint = target.querySelector<HTMLElement>('[data-hint]');
    if (!bar || !hint) return;

    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.6;
    source.connect(analyser);
    this.context = ctx;
    this.source = source;
    this.analyser = analyser;

    const buffer = new Uint8Array(analyser.frequencyBinCount);
    let band: Band | null = null;
    let shown = -1;
    const tick = (): void => {
      analyser.getByteFrequencyData(buffer);
      const avg = average(buffer);
      this.smoothed = this.smoothed * SMOOTHING + avg * (1 - SMOOTHING);
      const percent = Math.min(100, Math.round((this.smoothed / 180) * 100));
      if (percent !== shown) {
        shown = percent;
        bar.style.width = `${percent}%`;
      }
      this.silentTicks = percent < 4 ? this.silentTicks + 1 : 0;
      const next = bandFor(percent, this.silentTicks);
      if (next !== band) {
        band = next;
        hint.textContent = translator.t(BAND_KEYS[next]);
        hint.classList.toggle('text-warning', next === 'none');
        hint.classList.toggle('text-fg-muted', next !== 'none');
      }
      this.rafId = requestAnimationFrame(tick);
    };
    tick();
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.source?.disconnect();
    this.analyser?.disconnect();
    void this.context?.close();
    this.source = null;
    this.analyser = null;
    this.context = null;
    this.smoothed = 0;
    this.silentTicks = 0;
  }
}

const average = (buffer: Uint8Array): number => {
  if (buffer.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) sum += buffer[i] ?? 0;
  return sum / buffer.length;
};
