const SMOOTHING = 0.3;

export class AudioLevelMeter {
  private context: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private rafId: number | null = null;
  private smoothed = 0;
  private silentTicks = 0;

  start(target: HTMLElement, stream: MediaStream): void {
    this.stop();
    target.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="text-xs text-ink-400 w-16">Mic level</span>
        <div class="flex-1 h-2 rounded-full bg-ink-100 overflow-hidden">
          <div data-bar class="h-full rounded-full bg-primary transition-[width] duration-75 ease-linear" style="width:0%"></div>
        </div>
        <span data-hint class="text-xs text-ink-400 w-44 text-right"></span>
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
    const tick = (): void => {
      analyser.getByteFrequencyData(buffer);
      const avg = average(buffer);
      this.smoothed = this.smoothed * SMOOTHING + avg * (1 - SMOOTHING);
      const percent = Math.min(100, Math.round((this.smoothed / 180) * 100));
      bar.style.width = `${percent}%`;
      if (percent < 4) {
        this.silentTicks += 1;
        bar.classList.remove('bg-primary');
        bar.classList.add('bg-red-400');
      } else {
        this.silentTicks = 0;
        bar.classList.remove('bg-red-400');
        bar.classList.add('bg-primary');
      }
      hint.textContent =
        this.silentTicks > 60
          ? 'No sound detected · check mic'
          : percent < 4
            ? 'Silent'
            : percent < 25
              ? 'Quiet'
              : percent < 65
                ? 'OK'
                : 'Loud';
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
