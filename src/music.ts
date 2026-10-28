// Music theory helpers: notes, frequencies and scales

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export interface Scale {
  name: string;
  steps: number[]; // semitones above the root
}

export const SCALES: Record<string, Scale> = {
  major: { name: 'Major · happy', steps: [0, 2, 4, 5, 7, 9, 11] },
  minor: { name: 'Minor · moody', steps: [0, 2, 3, 5, 7, 8, 10] },
  pentatonic: { name: 'Pentatonic · dreamy', steps: [0, 2, 4, 7, 9] },
  blues: { name: 'Blues · soulful', steps: [0, 3, 5, 6, 7, 10] },
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

/** The notes of a scale going up from the root, e.g. C4 D4 E4 F4 ... */
export function scaleNotes(root: number, scaleId: string, count: number = MELODY_ROWS): number[] {
  const steps = (SCALES[scaleId] ?? SCALES.major).steps;
  const notes: number[] = [];
  for (let i = 0; notes.length < count; i++) {
    const octave = Math.floor(i / steps.length);
    notes.push(root + octave * 12 + steps[i % steps.length]);
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
