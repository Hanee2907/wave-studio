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
    osc.type = wave;
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
