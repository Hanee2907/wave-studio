// Every instrument is made from oscillators and noise. No sound files at all.
// Each function takes the audio context, where to send the sound, and when to play it.

import type { Wave } from '../song';

const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();

function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  let buffer = noiseCache.get(ctx);
  if (!buffer) {
    buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noiseCache.set(ctx, buffer);
  }
  return buffer;
}

function noise(ctx: BaseAudioContext): AudioBufferSourceNode {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  return source;
}

/** Deep thump: a sine wave that quickly drops in pitch */
export function kick(ctx: BaseAudioContext, out: AudioNode, time: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.setValueAtTime(160, time);
  osc.frequency.exponentialRampToValueAtTime(42, time + 0.14);
  gain.gain.setValueAtTime(1, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);
  osc.connect(gain).connect(out);
  osc.start(time);
  osc.stop(time + 0.5);
}

/** Crack: filtered noise plus a short tone for the body */
export function snare(ctx: BaseAudioContext, out: AudioNode, time: number): void {
  const n = noise(ctx);
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  filter.type = 'highpass';
  filter.frequency.value = 1200;
  gain.gain.setValueAtTime(0.7, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
  n.connect(filter).connect(gain).connect(out);
  n.start(time);
  n.stop(time + 0.25);

  const body = ctx.createOscillator();
  const bodyGain = ctx.createGain();
  body.type = 'triangle';
  body.frequency.setValueAtTime(190, time);
  bodyGain.gain.setValueAtTime(0.5, time);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
  body.connect(bodyGain).connect(out);
  body.start(time);
  body.stop(time + 0.12);
}

/** Tick: very short, very bright noise */
export function hat(ctx: BaseAudioContext, out: AudioNode, time: number): void {
  const n = noise(ctx);
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  filter.type = 'highpass';
  filter.frequency.value = 7500;
  gain.gain.setValueAtTime(0.32, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
  n.connect(filter).connect(gain).connect(out);
  n.start(time);
  n.stop(time + 0.06);
}

/** Clap: three quick bursts of noise, like several hands */
export function clap(ctx: BaseAudioContext, out: AudioNode, time: number): void {
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1600;
  filter.Q.value = 0.9;
  filter.connect(out);

  [0, 0.012, 0.024].forEach((offset, i) => {
    const n = noise(ctx);
    const gain = ctx.createGain();
    const start = time + offset;
    const length = i === 2 ? 0.18 : 0.02;
    gain.gain.setValueAtTime(0.7, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + length);
    n.connect(gain).connect(filter);
    n.start(start);
    n.stop(start + length + 0.01);
  });
}

/** Bass: a warm, low note with a closing filter */
export function bass(ctx: BaseAudioContext, out: AudioNode, time: number, freq: number, length: number): void {
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.value = freq;
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(900, time);
  filter.frequency.exponentialRampToValueAtTime(180, time + length);
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(0.5, time + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, time + length);
  osc.connect(filter).connect(gain).connect(out);
  osc.start(time);
  osc.stop(time + length + 0.05);
}

/** Lead synth: two slightly detuned oscillators sound wider and richer */
export function lead(
  ctx: BaseAudioContext, out: AudioNode, time: number, freq: number, length: number, wave: Wave,
): void {
  const gain = ctx.createGain();
  const level = wave === 'square' || wave === 'sawtooth' ? 0.16 : 0.3;

  // Envelope: quick attack, gentle fade
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(level, time + 0.015);
  gain.gain.exponentialRampToValueAtTime(level * 0.6, time + 0.12);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
  gain.connect(out);

  [-7, 7].forEach((cents) => {
    const osc = ctx.createOscillator();
    osc.type = wave === 'sitar' ? 'triangle' : wave; // sitar has its own plucked sound
    osc.frequency.value = freq;
    osc.detune.value = cents;
    osc.connect(gain);
    osc.start(time);
    osc.stop(time + length + 0.05);
  });
}

/** Metronome click for count-ins */
export function click(ctx: BaseAudioContext, out: AudioNode, time: number, accent: boolean): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = accent ? 1760 : 1320;
  gain.gain.setValueAtTime(0.35, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
  osc.connect(gain).connect(out);
  osc.start(time);
  osc.stop(time + 0.06);
}


// ================================
// Indian instruments
// ================================

/** Ge: the bayan (big left drum). A deep boom whose pitch slides up, like pressing the drum skin */
export function ge(ctx: BaseAudioContext, out: AudioNode, time: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.setValueAtTime(78, time);
  osc.frequency.linearRampToValueAtTime(108, time + 0.12);
  osc.frequency.exponentialRampToValueAtTime(96, time + 0.6);
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(0.9, time + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.7);
  osc.connect(gain).connect(out);
  osc.start(time);
  osc.stop(time + 0.75);
}

/**
 * The dayan (small right drum) is tuned to Sa. The black spot (syahi) on it makes
 * its overtones line up like a real note, so we add a few harmonics.
 */
function dayan(ctx: BaseAudioContext, out: AudioNode, time: number, freq: number, levels: number[], decay: number): void {
  levels.forEach((level, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq * (i + 1) * (i === 3 ? 1.02 : 1);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(level, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + decay / (1 + i * 0.5));
    osc.connect(gain).connect(out);
    osc.start(time);
    osc.stop(time + decay + 0.05);
  });

  // Finger "click" at the start
  const n = noise(ctx);
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  filter.type = 'highpass';
  filter.frequency.value = 2500;
  gain.gain.setValueAtTime(0.25, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.015);
  n.connect(filter).connect(gain).connect(out);
  n.start(time);
  n.stop(time + 0.02);
}

/** Na: sharp ringing stroke on the edge of the dayan */
export function na(ctx: BaseAudioContext, out: AudioNode, time: number, sa: number): void {
  dayan(ctx, out, time, sa, [0.4, 0.3, 0.16, 0.08], 0.55);
}

/** Tin: softer, open stroke on the dayan */
export function tin(ctx: BaseAudioContext, out: AudioNode, time: number, sa: number): void {
  dayan(ctx, out, time, sa, [0.18, 0.22, 0.1, 0.03], 0.32);
}

/** Ke / Kat: a flat slap on the bayan that doesn't ring */
export function ke(ctx: BaseAudioContext, out: AudioNode, time: number): void {
  const n = noise(ctx);
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  filter.type = 'lowpass';
  filter.frequency.value = 700;
  gain.gain.setValueAtTime(0.8, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.07);
  n.connect(filter).connect(gain).connect(out);
  n.start(time);
  n.stop(time + 0.08);
}

/** Manjira: small hand cymbals with a bright, metallic ring */
export function manjira(ctx: BaseAudioContext, out: AudioNode, time: number): void {
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 2200;
  filter.connect(out);

  [2637, 3729, 5274].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.05 / (i + 1), time + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.9);
    osc.connect(gain).connect(filter);
    osc.start(time);
    osc.stop(time + 0.95);
  });
}

/**
 * Tanpura: the drone behind Indian music. Four strings plucked in turn
 * (Pa, Sa, Sa, low Sa) across one rhythm cycle. A filter sweep gives the
 * buzzy "jawari" shimmer.
 */
export function tanpura(ctx: BaseAudioContext, out: AudioNode, time: number, sa: number, cycle: number): void {
  const strings = [sa - 5, sa, sa, sa - 12]; // MIDI notes
  strings.forEach((midi, i) => {
    const start = time + (i * cycle) / 4;
    const length = cycle * 1.1;
    const freq = 440 * Math.pow(2, (midi - 12 - 69) / 12); // one octave below, like a real tanpura

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.4;
    filter.frequency.setValueAtTime(freq * 12, start);
    filter.frequency.exponentialRampToValueAtTime(freq * 3, start + length);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.09, start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    filter.connect(gain).connect(out);

    [-3, 3].forEach((cents) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      osc.detune.value = cents;
      osc.connect(filter);
      osc.start(start);
      osc.stop(start + length + 0.05);
    });
  });
}

/**
 * Sitar-like pluck using the Karplus-Strong algorithm: a burst of noise
 * goes round a tiny loop that is exactly one wave long. Each trip round
 * the loop it gets smoother, which sounds just like a plucked string.
 */
const pluckCache = new WeakMap<BaseAudioContext, Map<string, AudioBuffer>>();

function pluckBuffer(ctx: BaseAudioContext, freq: number, seconds: number): AudioBuffer {
  let cache = pluckCache.get(ctx);
  if (!cache) {
    cache = new Map();
    pluckCache.set(ctx, cache);
  }
  const period = Math.max(2, Math.round(ctx.sampleRate / freq));
  const key = period + ':' + seconds.toFixed(1);
  const cached = cache.get(key);
  if (cached) return cached;

  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < period; i++) data[i] = Math.random() * 2 - 1;
  for (let i = period; i < length; i++) {
    // Average two neighbours (smooths the sound) and lose a tiny bit of energy each loop
    data[i] = 0.996 * 0.5 * (data[i - period] + data[i - period + 1]);
  }
  // Soft clipping adds a little buzz, like the sitar's "jawari" bridge
  for (let i = 0; i < length; i++) data[i] = Math.tanh(data[i] * 1.6) / Math.tanh(1.6);
  cache.set(key, buffer);
  return buffer;
}

export function sitar(ctx: BaseAudioContext, out: AudioNode, time: number, freq: number, length: number): void {
  const seconds = Math.min(2.4, Math.max(0.8, length + 0.8));
  const source = ctx.createBufferSource();
  source.buffer = pluckBuffer(ctx, freq, Math.round(seconds * 10) / 10);

  // Meend: the note slides up into place, like pulling a sitar string
  source.playbackRate.setValueAtTime(0.97, time);
  source.playbackRate.exponentialRampToValueAtTime(1, time + 0.07);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.55, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + seconds);
  source.connect(gain).connect(out);
  source.start(time);
  source.stop(time + seconds);
}
