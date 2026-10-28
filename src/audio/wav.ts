// Export the loop as a .wav file.
// The song is played into an OfflineAudioContext (much faster than real time),
// then the samples are written into the WAV file format by hand.

import type { Song } from '../song';
import { stepCount } from '../song';
import { buildChain } from './chain';
import { playStep, stepLength, swingOffset } from './play';

export async function renderWav(song: Song, loops = 2): Promise<Blob> {
  const sampleRate = 44100;
  const steps = stepCount(song);
  const loopSeconds = stepLength(song) * steps;
  const seconds = loopSeconds * loops + 2.5; // extra time so the reverb can fade out
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
  const chain = buildChain(ctx, song);

  for (let loop = 0; loop < loops; loop++) {
    for (let step = 0; step < steps; step++) {
      const time = 0.05 + loop * loopSeconds + step * stepLength(song) + swingOffset(song, step);
      playStep(ctx, chain.input, song, step, time);
    }
  }

  const buffer = await ctx.startRendering();
  return encodeWav(buffer);
}

function encodeWav(buffer: AudioBuffer): Blob {
  const channels = buffer.numberOfChannels;
  const length = buffer.length;
  const bytesPerSample = 2;
  const dataSize = length * channels * bytesPerSample;
  const view = new DataView(new ArrayBuffer(44 + dataSize));

  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  // WAV header
  writeText(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true);                                   // header size
  view.setUint16(20, 1, true);                                    // PCM format
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true);
  view.setUint16(34, 16, true);                                   // bits per sample
  writeText(36, 'data');
  view.setUint32(40, dataSize, true);

  // Samples, left and right mixed together (interleaved)
  const data = Array.from({ length: channels }, (_, c) => buffer.getChannelData(c));
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < channels; c++) {
      const sample = Math.max(-1, Math.min(1, data[c][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}
