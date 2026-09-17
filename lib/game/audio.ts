import type { Chart } from "./chart";

/** Synthesized click-track + hit sounds via Web Audio, so no copyrighted track needs to be fetched. */
export class GameAudio {
  private ctx: AudioContext;
  private closed = false;

  constructor() {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctor();
  }

  resume() {
    return this.ctx.resume();
  }

  close() {
    if (this.closed) return Promise.resolve();
    this.closed = true;
    return this.ctx.close();
  }

  get startTime() {
    return this.ctx.currentTime;
  }

  private beep(freq: number, atTime: number, durationMs: number, volume: number) {
    if (volume <= 0) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.value = Math.max(0, Math.min(1, volume));
    gain.gain.setTargetAtTime(0, atTime + durationMs / 1000, 0.01);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(atTime);
    osc.stop(atTime + durationMs / 1000 + 0.05);
  }

  /** Schedules a metronome click for every beat of the chart, starting at `startTime` (AudioContext clock). */
  scheduleMetronome(chart: Chart, startTime: number, volume: number) {
    const beatMs = 60000 / chart.bpm;
    const beats = Math.ceil(chart.lengthMs / beatMs);
    for (let i = 0; i < beats; i++) {
      const t = startTime + (2000 + i * beatMs) / 1000;
      this.beep(i % 4 === 0 ? 880 : 660, t, 40, volume * 0.25);
    }
  }

  playHitSound(volume: number) {
    this.beep(1200, this.ctx.currentTime, 30, volume);
  }
}
