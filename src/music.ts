// Music theory helpers: notes, frequencies, scales and ragas

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Indian note names (sargam). (k) = komal (flat), (t) = tivra (sharp) */
export const SARGAM = ['Sa', 'Re(k)', 'Re', 'Ga(k)', 'Ga', 'Ma', 'Ma(t)', 'Pa', 'Dha(k)', 'Dha', 'Ni(k)', 'Ni'];

export interface Scale {
  name: string;
  steps: number[];  // semitones above the root (Sa)
  indian?: boolean; // true for ragas
  mood?: string;
}

export const SCALES: Record<string, Scale> = {
  // Western scales
  major: { name: 'Major · happy', steps: [0, 2, 4, 5, 7, 9, 11] },
  minor: { name: 'Minor · moody', steps: [0, 2, 3, 5, 7, 8, 10] },
  pentatonic: { name: 'Pentatonic · dreamy', steps: [0, 2, 4, 7, 9] },
  blues: { name: 'Blues · soulful', steps: [0, 3, 5, 6, 7, 10] },

  // Ragas (the notes each raga uses), with their Carnatic cousin where there is one
  yaman: { name: 'Raag Yaman · Kalyani', steps: [0, 2, 4, 6, 7, 9, 11], indian: true, mood: 'Evening · peaceful, romantic' },
  bhupali: { name: 'Raag Bhupali · Mohanam', steps: [0, 2, 4, 7, 9], indian: true, mood: 'Evening · calm, devotional' },
  bhairav: { name: 'Raag Bhairav · Mayamalavagowla', steps: [0, 1, 4, 5, 7, 8, 11], indian: true, mood: 'Early morning · devotional, serious' },
  bhairavi: { name: 'Raag Bhairavi · Hanumatodi', steps: [0, 1, 3, 5, 7, 8, 10], indian: true, mood: 'Any time · bhajans, emotional' },
  bilawal: { name: 'Raag Bilawal · Shankarabharanam', steps: [0, 2, 4, 5, 7, 9, 11], indian: true, mood: 'Morning · bright, cheerful' },
  kafi: { name: 'Raag Kafi · Kharaharapriya', steps: [0, 2, 3, 5, 7, 9, 10], indian: true, mood: 'Late evening · folk, playful (Holi songs)' },
  khamaj: { name: 'Raag Khamaj · Harikambhoji', steps: [0, 2, 4, 5, 7, 9, 10], indian: true, mood: 'Night · romantic, thumri and ghazal' },
  desh: { name: 'Raag Desh', steps: [0, 2, 4, 5, 7, 9, 10, 11], indian: true, mood: 'Monsoon night · rainy, patriotic' },
  todi: { name: 'Raag Todi · Shubhapantuvarali', steps: [0, 1, 3, 6, 7, 8, 11], indian: true, mood: 'Morning · intense, longing' },
  darbari: { name: 'Raag Darbari Kanada', steps: [0, 2, 3, 5, 7, 8, 10], indian: true, mood: 'Midnight · royal, serious' },
  marwa: { name: 'Raag Marwa', steps: [0, 1, 4, 6, 9, 11], indian: true, mood: 'Sunset · restless, mysterious' },
  durga: { name: 'Raag Durga · Shuddha Saveri', steps: [0, 2, 5, 7, 9], indian: true, mood: 'Night · joyful, strong' },
  malkauns: { name: 'Raag Malkauns · Hindolam', steps: [0, 3, 5, 8, 10], indian: true, mood: 'Midnight · deep, meditative' },
  hamsadhwani: { name: 'Raag Hamsadhwani', steps: [0, 2, 4, 7, 11], indian: true, mood: 'Evening · festive, auspicious' },
  shivranjani: { name: 'Raag Shivranjani', steps: [0, 2, 3, 7, 9], indian: true, mood: 'Any time · sad, longing (a film song favourite)' },
};

/** How many note rows the melody grid has */
export const MELODY_ROWS = 10;

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function freqToMidi(freq: number): number {
  return 69 + 12 * Math.log2(freq / 440);
}

export function noteName(midi: number): string {
  const rounded = Math.round(midi);
  return NOTE_NAMES[((rounded % 12) + 12) % 12] + (Math.floor(rounded / 12) - 1);
}

/**
 * Sargam name of a note, counted from Sa (the root).
 * A dot above means the higher octave (taar saptak), a dot below the lower one (mandra).
 */
export function sargamName(midi: number, root: number): string {
  const distance = Math.round(midi) - root;
  const octave = Math.floor(distance / 12);
  const name = SARGAM[((distance % 12) + 12) % 12];
  const dot = octave > 0 ? '̇' : octave < 0 ? '̣' : '';
  return name[0] + dot + name.slice(1);
}

/**
 * The notes of a scale going up, e.g. C4 D4 E4 F4 ...
 * `below` starts a few notes under the root (Indian mode starts at mandra Dha and Ni).
 */
export function scaleNotes(root: number, scaleId: string, count: number = MELODY_ROWS, below = 0): number[] {
  const steps = (SCALES[scaleId] ?? SCALES.major).steps;
  const notes: number[] = [];
  for (let i = -below; notes.length < count; i++) {
    const octave = Math.floor(i / steps.length);
    const degree = ((i % steps.length) + steps.length) % steps.length;
    notes.push(root + octave * 12 + steps[degree]);
  }
  return notes;
}

/**
 * Find the grid row closest to a sung note.
 * Voices can be much lower or higher than the grid, so we first move the
 * note by whole octaves until it sits inside the grid's range.
 */
export function snapToRow(midi: number, notes: number[]): number {
  const low = notes[0];
  const high = notes[notes.length - 1];
  let m = midi;
  while (m < low - 0.5) m += 12;
  while (m > high + 0.5) m -= 12;

  let best = 0;
  let bestDistance = Infinity;
  notes.forEach((note, row) => {
    const distance = Math.abs(note - m);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = row;
    }
  });
  return best;
}
