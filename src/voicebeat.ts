// Beat from your voice: listen to HOW you sang and build drums that fit.
//
// 1. Find the "onsets": the steps where you started a new word, syllable or note.
// 2. Measure how busy (onsets per cycle) and how loud your singing was.
// 3. Pick a style, then place drums so they land with your rhythm.
//    Western mode builds a kit beat. Indian mode builds on the taal's theka.

import type { DrumId, Song } from './song';
import { beatStarts, STEPS, stepCount, TAALS, thekaDrums } from './song';

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
export function beatFromVoice(levels: number[][], melody: number[], song: Song): VoiceBeat {
  const steps = stepCount(song);

  // Loudness of each step = its loudest moment, scaled so the loudest step = 1
  const energy = levels.map((step) => (step.length ? Math.max(...step) : 0));
  const peak = Math.max(...energy, 0.0001);
  const norm = energy.map((e) => e / peak);

  // A new syllable starts when a note begins, changes, or suddenly gets louder
  const onsets = melody.map((row, s) => {
    if (row < 0 || s >= steps) return false;
    const prev = s === 0 ? -1 : melody[s - 1];
    const louder = s > 0 && energy[s] > energy[s - 1] * 1.6;
    return prev < 0 || prev !== row || louder;
  });

  const onsetCount = onsets.filter(Boolean).length;
  const voiced = energy.filter((_, s) => melody[s] >= 0);
  const loudness = voiced.length ? voiced.reduce((a, b) => a + b, 0) / voiced.length : 0;

  // More syllables = more energy. Really loud singing bumps it up one level.
  const styles: BeatStyle[] = ['Chill', 'Groove', 'Energetic'];
  let level = onsetCount <= steps / 4 ? 0 : onsetCount <= steps / 2 ? 1 : 2;
  if (loudness > 0.15) level = Math.min(2, level + 1);
  const style = styles[level];

  const drums = song.mode === 'indian'
    ? indianBeat(song, style, onsets, norm)
    : westernBeat(style, onsets, norm, melody);

  return { style, onsets, drums };
}

const empty = () => new Array<boolean>(STEPS).fill(false);

function westernBeat(style: BeatStyle, onsets: boolean[], norm: number[], melody: number[]): Record<DrumId, boolean[]> {
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

  // Extra kicks where you hit a strong syllable off the main beats
  [3, 6, 10, 11, 14].forEach((s) => {
    if (onsets[s] && norm[s] > 0.55 && !drums.snare[s] && !drums.clap[s]) drums.kick[s] = true;
  });

  // Hats also tick on your syllables, so the beat "talks" with your singing
  if (style !== 'Energetic') {
    onsets.forEach((isOnset, s) => { if (isOnset && s % 2 === 1) drums.hat[s] = true; });
  }

  // Bass plays with every kick and whenever you start a new phrase
  drums.kick.forEach((k, s) => { if (k) drums.bass[s] = true; });
  melody.forEach((row, s) => {
    if (row >= 0 && (s === 0 || melody[s - 1] < 0)) drums.bass[s] = true;
  });

  return drums;
}

function indianBeat(song: Song, style: BeatStyle, onsets: boolean[], norm: number[]): Record<DrumId, boolean[]> {
  const steps = stepCount(song);
  const starts = beatStarts(song);
  const marks = (TAALS[song.taal] ?? TAALS.teentaal).marks;

  if (style === 'Chill') {
    // Just the skeleton of the taal: Dha on sam, Tin on khali, manjira on sam
    const drums: Record<DrumId, boolean[]> = { kick: empty(), snare: empty(), hat: empty(), clap: empty(), bass: empty() };
    drums.kick[0] = true;
    drums.snare[0] = true;
    drums.bass[0] = true;
    starts.forEach((s, i) => {
      if (marks[i] === '0') drums.hat[s] = true;
      else if (s !== 0) drums.snare[s] = true;
    });
    // Soft Na strokes on your syllables
    onsets.forEach((isOnset, s) => { if (isOnset && s < steps && !drums.hat[s]) drums.snare[s] = true; });
    return drums;
  }

  // Groove and Energetic start from the full theka
  const drums = thekaDrums(song.taal);
  if (style === 'Energetic') {
    // Khali sections are "empty" (no bayan), so we must not add Ge there
    const khali = new Set<number>();
    starts.forEach((start, i) => {
      if (marks[i] !== '0') return;
      const end = starts[i + 1] ?? steps;
      for (let s = start; s < end; s++) khali.add(s);
    });

    starts.forEach((s) => { drums.bass[s] = true; });
    onsets.forEach((isOnset, s) => {
      if (!isOnset || s >= steps) return;
      if (norm[s] > 0.6 && !khali.has(s)) drums.kick[s] = true;          // strong syllable = Ge boom
      else if (!drums.snare[s] && !drums.hat[s]) drums.clap[s] = true;   // light one = Ke
    });
  }
  return drums;
}
