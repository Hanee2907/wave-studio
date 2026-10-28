// Hear what note you're singing.
//
// Uses autocorrelation: a sung note is a wave that repeats. We slide a copy of
// the sound over itself and find the shift where it lines up best. That shift
// is one wave cycle, and 1 / cycle length = the pitch.

const MIN_FREQ = 70;   // lowest note we listen for (deep voice)
const MAX_FREQ = 1100; // highest note (high soprano)

export function detectPitch(buf: Float32Array, sampleRate: number): number | null {
  // 1. Too quiet? Then nobody is singing.
  let rms = 0;
  for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / buf.length);
  if (rms < 0.012) return null;

  // 2. Compare the sound with shifted copies of itself
  const minLag = Math.floor(sampleRate / MAX_FREQ);
  const maxLag = Math.floor(sampleRate / MIN_FREQ);
  const size = buf.length - maxLag;
  const scores = new Float32Array(maxLag + 1);

  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    let energyA = 0;
    let energyB = 0;
    for (let i = 0; i < size; i++) {
      sum += buf[i] * buf[i + lag];
      energyA += buf[i] * buf[i];
      energyB += buf[i + lag] * buf[i + lag];
    }
    scores[lag] = sum / Math.sqrt(energyA * energyB + 1e-9); // 1 = perfect match
  }

  // 3. Take the FIRST strong peak (later peaks are just 2, 3... cycles)
  let bestLag = -1;
  let bestScore = 0;
  const strongest = Math.max(...scores.subarray(minLag));
  for (let lag = minLag + 1; lag < maxLag; lag++) {
    const isPeak = scores[lag] > scores[lag - 1] && scores[lag] >= scores[lag + 1];
    if (isPeak && scores[lag] > strongest * 0.9) {
      bestLag = lag;
      bestScore = scores[lag];
      break;
    }
  }
  if (bestLag < 0 || bestScore < 0.8) return null; // not a clear note (noise, breath)

  // 4. Fine-tune between samples with a parabola through the peak
  const a = scores[bestLag - 1];
  const b = scores[bestLag];
  const c = scores[bestLag + 1];
  const shift = (a - c) / (2 * (a - 2 * b + c) || 1);

  return sampleRate / (bestLag + shift);
}

/** Listens to the microphone and reports the pitch whenever asked */
export class PitchListener {
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private buffer = new Float32Array(2048);

  constructor(private ctx: AudioContext) {}

  get listening(): boolean {
    return this.stream !== null;
  }

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
    });
    const source = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    source.connect(this.analyser); // not connected to the speakers, so no echo
  }

  stop(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.analyser = null;
  }

  /** Current pitch in Hz, or null if silent */
  read(): number | null {
    if (!this.analyser) return null;
    this.analyser.getFloatTimeDomainData(this.buffer);
    return detectPitch(this.buffer, this.ctx.sampleRate);
  }
}
