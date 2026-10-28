// A glowing circle of frequency bars that breathes with the music

import { STEPS } from '../song';

export class Visualizer {
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private freq = new Uint8Array(512);
  private wave = new Uint8Array(1024);
  private pulse = 0;
  private step = -1;
  private sparks: { angle: number; dist: number; speed: number; life: number }[] = [];

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
  }

  private resize(): void {
    const ratio = window.devicePixelRatio || 1;
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;
    this.canvas.width = this.width * ratio;
    this.canvas.height = this.height * ratio;
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  /** Called on every kick drum: the circle jumps and throws sparks */
  kick(): void {
    this.pulse = 1;
    for (let i = 0; i < 14; i++) {
      this.sparks.push({ angle: Math.random() * Math.PI * 2, dist: 0, speed: 2 + Math.random() * 3, life: 1 });
    }
  }

  setStep(step: number): void {
    this.step = step;
  }

  draw(analyser: AnalyserNode | null, time: number): void {
    const { ctx, width: w, height: h } = this;
    const cx = w / 2;
    const cy = h / 2;
    const base = Math.min(w, h) * 0.18;
    // Colours drift gently but stay in the pink → violet → cyan family
    const hue = Math.sin(time / 4000) * 15;

    ctx.clearRect(0, 0, w, h);

    if (analyser) {
      analyser.getByteFrequencyData(this.freq);
      analyser.getByteTimeDomainData(this.wave);
    } else {
      this.freq.fill(0);
      this.wave.fill(128);
    }

    this.pulse *= 0.9;
    const radius = base * (1 + this.pulse * 0.18);

    // Soft glow in the middle
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 2.4);
    glow.addColorStop(0, `hsla(${hue + 300}, 100%, 65%, ${0.25 + this.pulse * 0.3})`);
    glow.addColorStop(1, 'hsla(260, 100%, 50%, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // Frequency bars around the circle (mirrored so it looks balanced)
    const bars = 96;
    for (let i = 0; i < bars; i++) {
      const half = i < bars / 2 ? i : bars - i;
      const value = this.freq[Math.floor((half / (bars / 2)) * 180) + 2] / 255;
      const angle = (i / bars) * Math.PI * 2 - Math.PI / 2;
      const length = 6 + value * base * 1.3;
      const x1 = cx + Math.cos(angle) * radius;
      const y1 = cy + Math.sin(angle) * radius;
      const x2 = cx + Math.cos(angle) * (radius + length);
      const y2 = cy + Math.sin(angle) * (radius + length);
      ctx.strokeStyle = `hsl(${310 - (half / (bars / 2)) * 120 + hue}, 100%, ${58 + value * 18}%)`;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Wave ring inside the circle
    ctx.beginPath();
    for (let i = 0; i <= 128; i++) {
      const sample = (this.wave[Math.floor((i / 128) * 1023)] - 128) / 128;
      const angle = (i / 128) * Math.PI * 2;
      const r = radius * 0.8 + sample * radius * 0.5;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 16 step dots in an outer ring
    for (let s = 0; s < STEPS; s++) {
      const angle = (s / STEPS) * Math.PI * 2 - Math.PI / 2;
      const r = Math.min(radius + base * 1.45, Math.min(w, h) / 2 - 14);
      const active = s === this.step;
      ctx.fillStyle = active ? '#ffffff' : s % 4 === 0 ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.arc(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, active ? 5 : 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sparks from kick drums
    this.sparks = this.sparks.filter((spark) => spark.life > 0);
    this.sparks.forEach((spark) => {
      spark.dist += spark.speed;
      spark.life -= 0.025;
      const r = radius + spark.dist;
      ctx.fillStyle = `hsla(${hue + 320}, 100%, 75%, ${spark.life})`;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(spark.angle) * r, cy + Math.sin(spark.angle) * r, 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}
