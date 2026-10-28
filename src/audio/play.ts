// Plays one step of the song. Shared by live playback and WAV export.

import { midiToFreq } from '../music';
import type { DrumId, Song } from '../song';
import { songNotes, stepCount } from '../song';
import { bass, clap, ge, hat, ke, kick, lead, manjira, na, sitar, snare, tanpura, tin } from './instruments';

/** Length of one step in seconds (a 16th note, or one matra in Indian mode) */
export function stepLength(song: Song): number {
  return 60 / song.bpm / 4;
}

/** Swing pushes every second step a little later, for a groovy feel */
export function swingOffset(song: Song, step: number): number {
  return step % 2 === 1 ? song.swing * stepLength(song) * 0.5 : 0;
}

/** Play one drum row's sound (Western kit or Indian tabla, depending on the mode) */
export function playDrum(ctx: BaseAudioContext, out: AudioNode, song: Song, id: DrumId, time: number): void {
  const sa = midiToFreq(song.root);
  if (song.mode === 'indian') {
    if (id === 'kick') ge(ctx, out, time);
    if (id === 'snare') na(ctx, out, time, sa);
    if (id === 'hat') tin(ctx, out, time, sa);
    if (id === 'clap') ke(ctx, out, time);
    if (id === 'bass') manjira(ctx, out, time);
  } else {
    if (id === 'kick') kick(ctx, out, time);
    if (id === 'snare') snare(ctx, out, time);
    if (id === 'hat') hat(ctx, out, time);
    if (id === 'clap') clap(ctx, out, time);
    if (id === 'bass') bass(ctx, out, time, midiToFreq(song.root - 24), stepLength(song) * 1.8);
  }
}

/** Play one melody note with the chosen sound */
export function playNote(ctx: BaseAudioContext, out: AudioNode, song: Song, midi: number, time: number, length: number): void {
  if (song.wave === 'sitar') sitar(ctx, out, time, midiToFreq(midi), length);
  else lead(ctx, out, time, midiToFreq(midi), length, song.wave);
}

export function playStep(ctx: BaseAudioContext, out: AudioNode, song: Song, step: number, time: number): void {
  const length = stepLength(song);
  const steps = stepCount(song);

  (Object.keys(song.drums) as DrumId[]).forEach((id) => {
    if (song.drums[id][step]) playDrum(ctx, out, song, id, time);
  });

  // The tanpura drone restarts at the start of every rhythm cycle
  if (song.mode === 'indian' && song.drone && step === 0) {
    tanpura(ctx, out, time, song.root, length * steps);
  }

  const row = song.melody[step];
  if (row >= 0) {
    // Let the note ring until the next note starts (up to 4 steps)
    let ring = 1;
    while (ring < 4 && song.melody[(step + ring) % steps] < 0) ring++;
    playNote(ctx, out, song, songNotes(song)[row], time, length * ring * 0.95);
  }
}
