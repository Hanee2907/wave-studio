// The song: everything needed to play (and share) a loop

import { MELODY_ROWS, SCALES, scaleNotes } from './music';

/** The grid always has room for 16 steps. Indian taals can use fewer (e.g. Dadra uses 12). */
export const STEPS = 16;

export type DrumId = 'kick' | 'snare' | 'hat' | 'clap' | 'bass';
export const DRUM_IDS: DrumId[] = ['kick', 'snare', 'hat', 'clap', 'bass'];

export type Wave = 'sine' | 'triangle' | 'square' | 'sawtooth' | 'sitar';
export const WAVES: Wave[] = ['sine', 'triangle', 'square', 'sawtooth', 'sitar'];

export type Mode = 'western' | 'indian';

export interface Song {
  mode: Mode;
  taal: string;       // Indian mode only
  drone: boolean;     // tanpura on/off (Indian mode only)
  bpm: number;
  swing: number;      // 0 to 0.6
  volume: number;     // 0 to 1
  scale: string;      // scale or raga id
  root: number;       // MIDI note of the root (Sa)
  wave: Wave;
  cutoff: number;     // filter cutoff in Hz
  reverb: number;     // 0 to 1
  delay: number;      // 0 to 1
  drums: Record<DrumId, boolean[]>;
  melody: number[];   // one row index per step, -1 = silent
}

/** Turn a pattern like "x...x...x...x..." into true/false steps (always 16 long) */
const pattern = (text: string): boolean[] =>
  Array.from({ length: STEPS }, (_, i) => text[i] === 'x');

/** Repeat a short pattern, e.g. an 8-beat taal twice */
const twice = (text: string) => text + text;


// ================================
// Taals (Indian rhythm cycles)
// In Indian mode the drum rows are: kick = Ge (bayan), snare = Na, hat = Tin,
// clap = Ke, bass = Manjira. Dha = Ge + Na, Dhin = Ge + Tin.
// ================================

export interface Taal {
  name: string;
  steps: number;              // matras shown on the grid
  vibhags: number[];          // where each section starts
  marks: string[];            // X = sam, 0 = khali, numbers = tali
  theka: Record<DrumId, string>;
}

export const TAALS: Record<string, Taal> = {
  teentaal: {
    name: 'Teentaal · 16',
    steps: 16,
    vibhags: [0, 4, 8, 12],
    marks: ['X', '2', '0', '3'],
    // Dha Dhin Dhin Dha | Dha Dhin Dhin Dha | Dha Tin Tin Ta | Ta Dhin Dhin Dha
    theka: {
      kick:  'xxxxxxxxx....xxx',
      snare: 'x..xx..xx..xx..x',
      hat:   '.xx..xx..xx..xx.',
      clap:  '................',
      bass:  'x...x.......x...',
    },
  },
  keherwa: {
    name: 'Keherwa · 8',
    steps: 16,
    vibhags: [0, 4, 8, 12],
    marks: ['X', '0', 'X', '0'],
    // Dha Ge Na Ti | Na Ke Dhin Na  (played twice)
    theka: {
      kick:  twice('xx....x.'),
      snare: twice('x.x.x..x'),
      hat:   twice('...x..x.'),
      clap:  twice('.....x..'),
      bass:  twice('x...x...'),
    },
  },
  dadra: {
    name: 'Dadra · 6',
    steps: 12,
    vibhags: [0, 3, 6, 9],
    marks: ['X', '0', 'X', '0'],
    // Dha Dhin Na | Dha Tin Na  (played twice)
    theka: {
      kick:  twice('xx.x..'),
      snare: twice('x.xx.x'),
      hat:   twice('.x..x.'),
      clap:  twice('......'),
      bass:  twice('x.....'),
    },
  },
  rupak: {
    name: 'Rupak · 7',
    steps: 14,
    vibhags: [0, 3, 5, 7, 10, 12],
    marks: ['X', '2', '3', 'X', '2', '3'],
    // Tin Tin Na | Dhin Na | Dhin Na  (played twice, sam falls on khali)
    theka: {
      kick:  twice('...x.x.'),
      snare: twice('..x.x.x'),
      hat:   twice('xx.x.x.'),
      clap:  twice('.......'),
      bass:  twice('x......'),
    },
  },
  jhaptaal: {
    name: 'Jhaptaal · 10',
    steps: 10,
    vibhags: [0, 2, 5, 7],
    marks: ['X', '2', '0', '3'],
    // Dhin Na | Dhin Dhin Na | Tin Na | Dhin Dhin Na
    theka: {
      kick:  'x.xx...xx.',
      snare: '.x..x.x..x',
      hat:   'x.xx.x.xx.',
      clap:  '..........',
      bass:  'x....x....',
    },
  },
  ektaal: {
    name: 'Ektaal · 12',
    steps: 12,
    vibhags: [0, 2, 4, 6, 8, 10],
    marks: ['X', '0', '2', '0', '3', '4'],
    // Dhin Dhin | Dha Tirakita | Tu Na | Kat Ta | Dha Tirakita | Dhin Na
    theka: {
      kick:  'xxx.....x.x.',
      snare: '..x..x.xx..x',
      hat:   'xx..x.....x.',
      clap:  '...x..x..x..',
      bass:  'x...x...x...',
    },
  },
  adi: {
    name: 'Adi talam · 8 (Carnatic)',
    steps: 16,
    vibhags: [0, 8, 12],
    marks: ['X', '2', '3'],
    theka: {
      kick:  'x.....x.x.....x.',
      snare: 'x.x.x...x.x.x...',
      hat:   '...x...x...x...x',
      clap:  '.....x.......x..',
      bass:  'x.......x...x...',
    },
  },
};

export function stepCount(song: Song): number {
  return song.mode === 'indian' ? (TAALS[song.taal] ?? TAALS.teentaal).steps : STEPS;
}

/** Steps where a beat (Western) or a vibhag (Indian) starts */
export function beatStarts(song: Song): number[] {
  return song.mode === 'indian' ? (TAALS[song.taal] ?? TAALS.teentaal).vibhags : [0, 4, 8, 12];
}

/** The melody rows' notes. Indian mode starts 2 notes below Sa (mandra saptak). */
export function songNotes(song: Song): number[] {
  return scaleNotes(song.root, song.scale, MELODY_ROWS, song.mode === 'indian' ? 2 : 0);
}

export function thekaDrums(taalId: string): Record<DrumId, boolean[]> {
  const theka = (TAALS[taalId] ?? TAALS.teentaal).theka;
  return {
    kick: pattern(theka.kick), snare: pattern(theka.snare), hat: pattern(theka.hat),
    clap: pattern(theka.clap), bass: pattern(theka.bass),
  };
}


// ================================
// Presets
// ================================

const empty = (): boolean[] => new Array(STEPS).fill(false);

export function emptySong(): Song {
  return {
    mode: 'western',
    taal: 'teentaal',
    drone: false,
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

/** Pad a short melody with silence up to 16 steps */
const melody = (rows: number[]): number[] => rows.concat(new Array(STEPS - rows.length).fill(-1));

function indianSong(taal: string, scale: string, rows: number[], extra: Partial<Song> = {}): Song {
  return {
    ...emptySong(),
    mode: 'indian',
    taal,
    drone: true,
    bpm: 90,
    scale,
    wave: 'sitar',
    cutoff: 7000,
    reverb: 0.35,
    delay: 0.1,
    drums: thekaDrums(taal),
    melody: melody(rows),
    ...extra,
  };
}

export interface Preset {
  name: string;
  mode: Mode;
  song: Song;
}

export const PRESETS: Record<string, Preset> = {
  // ----- Western -----
  lofi: {
    name: 'Lo-fi chill',
    mode: 'western',
    song: {
      ...emptySong(),
      bpm: 82, swing: 0.35, scale: 'pentatonic', root: 57, wave: 'sine', cutoff: 2200, reverb: 0.45, delay: 0.25,
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
    mode: 'western',
    song: {
      ...emptySong(),
      bpm: 112, scale: 'major', root: 60, wave: 'square', cutoff: 3600, reverb: 0.2, delay: 0.1,
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
    mode: 'western',
    song: {
      ...emptySong(),
      bpm: 96, scale: 'minor', root: 57, wave: 'sawtooth', cutoff: 1800, reverb: 0.5, delay: 0.35,
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
  empty: { name: 'Blank page', mode: 'western', song: emptySong() },

  // ----- Indian -----
  // Melodies use each raga's pakad (its signature phrase).
  // Row numbers: for 7-note ragas 0 = Dha (low), 1 = Ni (low), 2 = Sa, 3 = Re, 4 = Ga, 5 = Ma, 6 = Pa...
  yaman: {
    name: 'Yaman · Teentaal (evening)',
    mode: 'indian',
    // Ni Re Ga Re Sa, Pa Ma Ga Re Sa
    song: indianSong('teentaal', 'yaman', [1, -1, 3, 4, 3, -1, 2, -1, 6, 5, 4, 3, 2, -1, -1, -1]),
  },
  bhupali: {
    name: 'Bhupali · Keherwa (bhajan)',
    mode: 'indian',
    // Ga Re Sa Dha Sa Re Ga, Pa Ga Re Sa
    song: indianSong('keherwa', 'bhupali', [4, 3, 2, 1, 2, 3, 4, -1, 5, 4, 3, -1, 2, -1, -1, -1], { bpm: 100 }),
  },
  bhairavi: {
    name: 'Bhairavi · Keherwa (devotional)',
    mode: 'indian',
    song: indianSong('keherwa', 'bhairavi', [6, -1, 7, 6, 5, 4, -1, 3, 2, -1, 4, 3, 2, -1, -1, -1], { bpm: 84, wave: 'sine', cutoff: 4000 }),
  },
  kafi: {
    name: 'Kafi · Dadra (folk)',
    mode: 'indian',
    song: indianSong('dadra', 'kafi', [2, 3, 4, 5, 6, -1, 5, 4, 3, 2, -1, -1], { bpm: 120, wave: 'square', cutoff: 2600 }),
  },
  shivranjani: {
    name: 'Shivranjani · Dadra (sad song)',
    mode: 'indian',
    song: indianSong('dadra', 'shivranjani', [5, 4, 3, 4, 3, 2, -1, 1, 2, -1, -1, -1], { bpm: 96, wave: 'sine', cutoff: 3500, reverb: 0.5 }),
  },
  bhairav: {
    name: 'Bhairav · Rupak (morning)',
    mode: 'indian',
    // Sa Ga Ma Pa dha Pa, Ga Ma re Sa
    song: indianSong('rupak', 'bhairav', [2, 4, 5, 6, 7, 6, -1, 4, 5, 3, -1, 2, -1, -1], { bpm: 80 }),
  },
  malkauns: {
    name: 'Malkauns · Jhaptaal (midnight)',
    mode: 'indian',
    // Ma ga Ma dha ni dha Ma, ga Sa
    song: indianSong('jhaptaal', 'malkauns', [4, 3, 4, 5, 6, 5, 4, -1, 3, 2], { bpm: 86, reverb: 0.5 }),
  },
  desh: {
    name: 'Desh · Ektaal (monsoon)',
    mode: 'indian',
    song: indianSong('ektaal', 'desh', [2, 3, 5, 6, 8, 9, 8, 7, 6, 5, 4, 3], { bpm: 92 }),
  },
  hamsadhwani: {
    name: 'Hamsadhwani · Adi talam (Carnatic)',
    mode: 'indian',
    // Sa Ri Ga Pa Ni Sa, Ni Pa Ga Ri Sa
    song: indianSong('adi', 'hamsadhwani', [2, 3, 4, 5, 6, 7, -1, 6, 5, 4, 3, -1, 2, -1, -1, -1], { bpm: 104, wave: 'triangle' }),
  },
};

export function cloneSong(song: Song): Song {
  return JSON.parse(JSON.stringify(song)) as Song;
}


// ================================
// Share links: the whole song lives in the URL
// ================================

function stepsToHex(steps: boolean[]): string {
  let bits = 0;
  steps.forEach((on, i) => { if (on) bits |= 1 << i; });
  return bits.toString(16).padStart(4, '0');
}

function hexToSteps(hex: string): boolean[] {
  const bits = parseInt(hex, 16) || 0;
  return Array.from({ length: STEPS }, (_, i) => (bits & (1 << i)) !== 0);
}

/** Pack a song into a short string, e.g. "v2.i.teentaal.1.90.0.80.yaman..." */
export function encodeSong(song: Song): string {
  const melodyText = song.melody.map((row) => (row < 0 ? '-' : row.toString(36))).join('');
  return [
    'v2',
    song.mode === 'indian' ? 'i' : 'w',
    song.taal,
    song.drone ? 1 : 0,
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
    melodyText,
  ].join('.');
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Read a song back from a share link. Returns null if the link is broken. */
export function decodeSong(text: string): Song | null {
  let parts = text.split('.');
  const song = emptySong();

  if (parts[0] === 'v2' && parts.length === 15) {
    song.mode = parts[1] === 'i' ? 'indian' : 'western';
    song.taal = TAALS[parts[2]] ? parts[2] : 'teentaal';
    song.drone = parts[3] === '1';
    parts = ['v1', ...parts.slice(4)]; // the rest is the same as version 1
  }
  if (parts.length !== 12 || parts[0] !== 'v1') return null;

  song.bpm = clamp(Number(parts[1]) || 100, 50, 180);
  song.swing = clamp((Number(parts[2]) || 0) / 100, 0, 0.6);
  song.volume = clamp((Number(parts[3]) || 80) / 100, 0, 1);
  song.scale = SCALES[parts[4]] ? parts[4] : song.mode === 'indian' ? 'yaman' : 'major';
  song.root = clamp(Number(parts[5]) || 60, 36, 72);
  song.wave = WAVES.includes(parts[6] as Wave) ? (parts[6] as Wave) : 'triangle';
  song.cutoff = clamp(Number(parts[7]) || 5000, 200, 12000);
  song.reverb = clamp((Number(parts[8]) || 0) / 100, 0, 1);
  song.delay = clamp((Number(parts[9]) || 0) / 100, 0, 1);

  const drums = parts[10];
  if (drums.length !== DRUM_IDS.length * 4) return null;
  DRUM_IDS.forEach((id, i) => { song.drums[id] = hexToSteps(drums.slice(i * 4, i * 4 + 4)); });

  const melodyText = parts[11];
  if (melodyText.length !== STEPS) return null;
  song.melody = melodyText.split('').map((c) => {
    if (c === '-') return -1;
    const row = parseInt(c, 36);
    return row >= 0 && row < MELODY_ROWS ? row : -1;
  });

  return song;
}
