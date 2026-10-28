// Plays one step of the song. Shared by live playback and WAV export.

import { midiToFreq, scaleNotes } from '../music';
import type { Song } from '../song';
import { bass, clap, hat, kick, lead, snare } from './instruments';

/** Length of one step (a 16th note) in seconds */
export function stepLength(song: Song): number {
  return 60 / song.bpm / 4;
}

/** Swing pushes every second step a little later, for a groovy feel */
export function swingOffset(song: Song, step: number): number {
  return step % 2 === 1 ? song.swing * stepLength(song) * 0.5 : 0;
}

export function playStep(ctx: BaseAudioContext, out: AudioNode, song: Song, step: number, time: number): void {
  const length = stepLength(song);
  const d = song.drums;

  if (d.kick[step]) kick(ctx, out, time);
  if (d.snare[step]) snare(ctx, out, time);
  if (d.hat[step]) hat(ctx, out, time);
  if (d.clap[step]) clap(ctx, out, time);
  if (d.bass[step]) bass(ctx, out, time, midiToFreq(song.root - 24), length * 1.8);

  const row = song.melody[step];
  if (row >= 0) {
    // Let the note ring until the next note starts (up to 4 steps)
    let ring = 1;
    while (ring < 4 && song.melody[(step + ring) % 16] < 0) ring++;
    const midi = scaleNotes(song.root, song.scale)[row];
    lead(ctx, out, time, midiToFreq(midi), length * ring * 0.95, song.wave);
  }
}
