// The effects chain every sound goes through:
//
//   instruments ─► input ─► filter ─► master ─► compressor ─► analyser ─► speakers
//                    │                  ▲
//                    ├─► reverb send ───┤
//                    └─► delay send ────┘

import type { Song } from '../song';

export interface Chain {
  input: GainNode;
  filter: BiquadFilterNode;
  master: GainNode;
  reverbSend: GainNode;
  delaySend: GainNode;
  delay: DelayNode;
  analyser: AnalyserNode;
}

/** A fake "room" made from fading random noise */
function makeImpulse(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.6);
    }
  }
  return impulse;
}

export function buildChain(ctx: BaseAudioContext, song: Song): Chain {
  const input = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  const master = ctx.createGain();
  const compressor = ctx.createDynamicsCompressor();
  const analyser = ctx.createAnalyser();

  filter.type = 'lowpass';
  filter.Q.value = 0.8;
  compressor.threshold.value = -14;
  compressor.ratio.value = 4;
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.8;

  // A little headroom after the compressor so loud moments never clip
  const output = ctx.createGain();
  output.gain.value = 0.6;

  input.connect(filter);
  filter.connect(master);
  master.connect(compressor);
  compressor.connect(output);
  output.connect(analyser);
  analyser.connect(ctx.destination);

  // Reverb
  const reverbSend = ctx.createGain();
  const convolver = ctx.createConvolver();
  convolver.buffer = makeImpulse(ctx, 2.4);
  filter.connect(reverbSend);
  reverbSend.connect(convolver);
  convolver.connect(master);

  // Echo (delay with feedback)
  const delaySend = ctx.createGain();
  const delay = ctx.createDelay(2);
  const feedback = ctx.createGain();
  feedback.gain.value = 0.38;
  filter.connect(delaySend);
  delaySend.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(master);

  const chain = { input, filter, master, reverbSend, delaySend, delay, analyser };
  applySettings(chain, song, ctx.currentTime);
  return chain;
}

/** Smoothly move the knobs to match the song settings */
export function applySettings(chain: Chain, song: Song, now: number): void {
  chain.filter.frequency.setTargetAtTime(song.cutoff, now, 0.05);
  chain.master.gain.setTargetAtTime(song.volume, now, 0.05);
  chain.reverbSend.gain.setTargetAtTime(song.reverb * 0.9, now, 0.05);
  chain.delaySend.gain.setTargetAtTime(song.delay * 0.6, now, 0.05);
  chain.delay.delayTime.setTargetAtTime((60 / song.bpm) * 0.75, now, 0.05); // dotted eighth note echo
}
