// The song: everything needed to play (and share) a loop

import { MELODY_ROWS, SCALES } from './music';

export const STEPS = 16;

export type DrumId = 'kick' | 'snare' | 'hat' | 'clap' | 'bass';
export const DRUM_IDS: DrumId[] = ['kick', 'snare', 'hat', 'clap', 'bass'];

export type Wave = 'sine' | 'triangle' | 'square' | 'sawtooth';
export const WAVES: Wave[] = ['sine', 'triangle', 'square', 'sawtooth'];

export interface Song {
  bpm: number;
  swing: number;      // 0 to 0.6
  volume: number;     // 0 to 1
  scale: string;
  root: number;       // MIDI note of the lowest melody row
  wave: Wave;
  cutoff: number;     // filter cutoff in Hz
  reverb: number;     // 0 to 1
  delay: number;      // 0 to 1
  drums: Record<DrumId, boolean[]>;
  melody: number[];   // one row index per step, -1 = silent
}

const empty = (): boolean[] => new Array(STEPS).fill(false);

/** Turn a pattern like "x...x...x...x..." into true/false steps */
const pattern = (text: string): boolean[] => text.split('').map((c) => c === 'x');

export function emptySong(): Song {
  return {
    bpm: 100,
    swing: 0,
    volume: 0.8,
    scale: 'major',
    root: 60,
    wave: 'triangle',
    cutoff: 5000,
    reverb: 0.25,
    delay: 0.15,
    drums: { kick: empty(), snare: empty(), hat: empty(), clap: empty(), bass: empty() },
    melody: new Array(STEPS).fill(-1),
  };
}

export const PRESETS: Record<string, { name: string; song: Song }> = {
  lofi: {
    name: 'Lo-fi chill',
    song: {
      ...emptySong(),
      bpm: 82,
      swing: 0.35,
      scale: 'pentatonic',
      root: 57,
      wave: 'sine',
      cutoff: 2200,
      reverb: 0.45,
      delay: 0.25,
      drums: {
        kick:  pattern('x.....x...x.....'),
        snare: pattern('....x.......x...'),
        hat:   pattern('x.x.x.x.x.x.x.x.'),
        clap:  pattern('................'),
        bass:  pattern('x.....x...x.....'),
      },
      melody: [4, -1, 6, -1, 5, -1, 3, -1, 4, -1, -1, 2, 3, -1, 1, -1],
    },
  },
  pop: {
    name: 'Pop bounce',
    song: {
      ...emptySong(),
      bpm: 112,
      scale: 'major',
      root: 60,
      wave: 'square',
      cutoff: 3600,
      reverb: 0.2,
      delay: 0.1,
      drums: {
        kick:  pattern('x...x...x...x...'),
        snare: pattern('....x.......x...'),
        hat:   pattern('..x...x...x...x.'),
        clap:  pattern('....x.......x..x'),
        bass:  pattern('x..x..x.x..x..x.'),
      },
      melody: [7, -1, 7, 6, 4, -1, 4, -1, 5, -1, 6, 5, 4, -1, 2, -1],
    },
  },
  synthwave: {
    name: 'Synthwave night',
    song: {
      ...emptySong(),
      bpm: 96,
      scale: 'minor',
      root: 57,
      wave: 'sawtooth',
      cutoff: 1800,
      reverb: 0.5,
      delay: 0.35,
      drums: {
        kick:  pattern('x...x...x...x...'),
        snare: pattern('....x.......x...'),
        hat:   pattern('xxxxxxxxxxxxxxxx'),
        clap:  pattern('................'),
        bass:  pattern('x.xxx.xxx.xxx.xx'),
      },
      melody: [0, -1, 2, -1, 4, -1, 7, 6, 4, -1, 2, -1, 3, -1, -1, -1],
    },
  },
  empty: { name: 'Blank page', song: emptySong() },
};

export function cloneSong(song: Song): Song {
  return JSON.parse(JSON.stringify(song)) as Song;
}


// ----- Share links: the whole song lives in the URL -----

function stepsToHex(steps: boolean[]): string {
  let bits = 0;
  steps.forEach((on, i) => { if (on) bits |= 1 << i; });
  return bits.toString(16).padStart(4, '0');
}

function hexToSteps(hex: string): boolean[] {
  const bits = parseInt(hex, 16) || 0;
  return Array.from({ length: STEPS }, (_, i) => (bits & (1 << i)) !== 0);
}

/** Pack a song into a short string, e.g. "100.0.80.major.60.triangle..." */
export function encodeSong(song: Song): string {
  const melody = song.melody.map((row) => (row < 0 ? '-' : row.toString(36))).join('');
  return [
    'v1',
    song.bpm,
    Math.round(song.swing * 100),
    Math.round(song.volume * 100),
    song.scale,
    song.root,
    song.wave,
    Math.round(song.cutoff),
    Math.round(song.reverb * 100),
    Math.round(song.delay * 100),
    DRUM_IDS.map((id) => stepsToHex(song.drums[id])).join(''),
    melody,
  ].join('.');
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Read a song back from a share link. Returns null if the link is broken. */
export function decodeSong(text: string): Song | null {
  const parts = text.split('.');
  if (parts.length !== 12 || parts[0] !== 'v1') return null;

  const song = emptySong();
  song.bpm = clamp(Number(parts[1]) || 100, 60, 180);
  song.swing = clamp((Number(parts[2]) || 0) / 100, 0, 0.6);
  song.volume = clamp((Number(parts[3]) || 80) / 100, 0, 1);
  song.scale = SCALES[parts[4]] ? parts[4] : 'major';
  song.root = clamp(Number(parts[5]) || 60, 36, 72);
  song.wave = (['sine', 'triangle', 'square', 'sawtooth'] as Wave[]).includes(parts[6] as Wave)
    ? (parts[6] as Wave) : 'triangle';
  song.cutoff = clamp(Number(parts[7]) || 5000, 200, 12000);
  song.reverb = clamp((Number(parts[8]) || 0) / 100, 0, 1);
  song.delay = clamp((Number(parts[9]) || 0) / 100, 0, 1);

  const drums = parts[10];
  if (drums.length !== DRUM_IDS.length * 4) return null;
  DRUM_IDS.forEach((id, i) => { song.drums[id] = hexToSteps(drums.slice(i * 4, i * 4 + 4)); });

  const melody = parts[11];
  if (melody.length !== STEPS) return null;
  song.melody = melody.split('').map((c) => {
    if (c === '-') return -1;
    const row = parseInt(c, 36);
    return row >= 0 && row < MELODY_ROWS ? row : -1;
  });

  return song;
}
