// Beat from your voice: listen to HOW you sang and build drums that fit.
//
// 1. Find the "onsets": the steps where you started a new word, syllable or note.
// 2. Measure how busy (onsets per bar) and how strong your singing was.
// 3. Pick a style, then place drums so the kick and hats land with your rhythm.

import type { DrumId } from './song';
import { STEPS } from './song';

export type BeatStyle = 'Chill' | 'Groove' | 'Energetic';

export interface VoiceBeat {
  style: BeatStyle;
  onsets: boolean[];
  drums: Record<DrumId, boolean[]>;
}

/**
 * @param levels  loudness readings heard during each step
 * @param melody  the notes picked for each step (-1 = silent)
 */
export function beatFromVoice(levels: number[][], melody: number[]): VoiceBeat {
  // Loudness of each step = its loudest moment, scaled so the loudest step = 1
  const energy = levels.map((step) => (step.length ? Math.max(...step) : 0));
  const peak = Math.max(...energy, 0.0001);
  const norm = energy.map((e) => e / peak);

  // A new syllable starts when a note begins, changes, or suddenly gets louder
  const onsets = melody.map((row, s) => {
    if (row < 0) return false;
    const prev = s === 0 ? -1 : melody[s - 1];
    const louder = s > 0 && energy[s] > energy[s - 1] * 1.6;
    return prev < 0 || prev !== row || louder;
  });

  const onsetCount = onsets.filter(Boolean).length;
  const voiced = energy.filter((_, s) => melody[s] >= 0);
  const loudness = voiced.length ? voiced.reduce((a, b) => a + b, 0) / voiced.length : 0;

  // More syllables = more energy. Really loud singing bumps it up one level.
  const styles: BeatStyle[] = ['Chill', 'Groove', 'Energetic'];
  let level = onsetCount <= 4 ? 0 : onsetCount <= 8 ? 1 : 2;
  if (loudness > 0.15) level = Math.min(2, level + 1);
  const style = styles[level];

  const empty = () => new Array<boolean>(STEPS).fill(false);
  const drums: Record<DrumId, boolean[]> = { kick: empty(), snare: empty(), hat: empty(), clap: empty(), bass: empty() };
  const on = (id: DrumId, ...steps: number[]) => steps.forEach((s) => { drums[id][s] = true; });

  if (style === 'Chill') {
    // Half-time: slow and spacious
    on('kick', 0);
    on('snare', 8);
    on('hat', 2, 6, 10, 14);
  } else if (style === 'Groove') {
    // Classic backbeat
    on('kick', 0, 8);
    on('snare', 4, 12);
    for (let s = 0; s < STEPS; s += 2) on('hat', s);
  } else {
    // Four-on-the-floor dance beat
    on('kick', 0, 4, 8, 12);
    on('clap', 4, 12);
    on('snare', 12);
    for (let s = 0; s < STEPS; s++) on('hat', s);
  }

  // The voice part: extra kicks where you hit a strong syllable off the main beats
  const kickSpots = [3, 6, 10, 11, 14];
  kickSpots.forEach((s) => {
    if (onsets[s] && norm[s] > 0.55 && !drums.snare[s] && !drums.clap[s]) drums.kick[s] = true;
  });

  // Hats also tick on your syllables, so the beat "talks" with your singing
  if (style !== 'Energetic') {
    onsets.forEach((isOnset, s) => { if (isOnset && s % 2 === 1) drums.hat[s] = true; });
  }

  // Bass plays with every kick and whenever you start a new phrase
  drums.kick.forEach((k, s) => { if (k) drums.bass[s] = true; });
  melody.forEach((row, s) => {
    const phraseStart = row >= 0 && (s === 0 || melody[s - 1] < 0);
    if (phraseStart) drums.bass[s] = true;
  });

  return { style, onsets, drums };
}
