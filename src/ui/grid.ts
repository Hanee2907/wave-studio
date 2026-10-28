// The step sequencer grid: 5 drum rows + 10 melody rows, up to 16 steps each.
// In Indian mode the drums become tabla strokes, the top row shows the bols
// (Dha, Dhin, Na...) and the taal markers (X = sam, 0 = khali).

import { MELODY_ROWS, noteName, sargamName } from '../music';
import type { DrumId, Song } from '../song';
import { beatStarts, DRUM_IDS, songNotes, STEPS, stepCount, TAALS } from '../song';

const WESTERN_LABELS: Record<DrumId, string> = {
  kick: '🥁 Kick',
  snare: '🪘 Snare',
  hat: '🎩 Hi-hat',
  clap: '👏 Clap',
  bass: '🎸 Bass',
};

const INDIAN_LABELS: Record<DrumId, string> = {
  kick: '🪘 Ge · bayan',
  snare: 'Na · dayan',
  hat: 'Tin · dayan',
  clap: 'Ke · slap',
  bass: '🔔 Manjira',
};

/** The tabla syllable (bol) for one step, from which strokes are on */
function bolAt(song: Song, step: number): string {
  const d = song.drums;
  const g = d.kick[step];
  if (g && d.snare[step]) return 'Dha';
  if (g && d.hat[step]) return 'Dhin';
  if (d.snare[step]) return 'Na';
  if (d.hat[step]) return 'Tin';
  if (g) return 'Ge';
  if (d.clap[step]) return 'Ke';
  return '–';
}

export interface GridHandlers {
  toggleDrum: (id: DrumId, step: number) => void;
  setMelody: (step: number, row: number) => void;
  previewRow: (row: number) => void;
}

export class Grid {
  private gridEl = document.querySelector<HTMLElement>('.grid')!;
  private drumCells: Record<string, HTMLButtonElement[]> = {};
  private drumLabels: Record<string, HTMLElement> = {};
  private melodyCells: HTMLButtonElement[][] = []; // [row][step]
  private noteLabels: HTMLButtonElement[] = [];
  private numbers: HTMLElement[] = [];
  private marks: HTMLElement[] = [];
  private currentStep = -1;

  constructor(private handlers: GridHandlers) {
    this.buildMarks();
    this.buildNumbers();
    this.buildDrums();
    this.buildMelody();
  }

  private buildMarks(): void {
    const row = document.getElementById('taal-marks')!;
    row.appendChild(document.createElement('span'));
    for (let step = 0; step < STEPS; step++) {
      const mark = document.createElement('span');
      mark.className = 'mark';
      row.appendChild(mark);
      this.marks.push(mark);
    }
  }

  private buildNumbers(): void {
    const row = document.getElementById('step-numbers')!;
    row.appendChild(document.createElement('span')); // empty corner
    for (let step = 0; step < STEPS; step++) {
      const n = document.createElement('span');
      n.className = 'num';
      row.appendChild(n);
      this.numbers.push(n);
    }
  }

  private buildDrums(): void {
    const box = document.getElementById('drum-grid')!;
    DRUM_IDS.forEach((id) => {
      const row = document.createElement('div');
      row.className = 'row drum-row ' + id;

      const label = document.createElement('span');
      label.className = 'row-label';
      row.appendChild(label);
      this.drumLabels[id] = label;

      this.drumCells[id] = [];
      for (let step = 0; step < STEPS; step++) {
        const cell = document.createElement('button');
        cell.className = 'cell';
        cell.addEventListener('click', () => this.handlers.toggleDrum(id, step));
        row.appendChild(cell);
        this.drumCells[id].push(cell);
      }
      box.appendChild(row);
    });
  }

  private buildMelody(): void {
    const box = document.getElementById('melody-grid')!;
    // Highest note on top, like a piano roll
    for (let row = MELODY_ROWS - 1; row >= 0; row--) {
      const line = document.createElement('div');
      line.className = 'row melody-row';

      const label = document.createElement('button');
      label.className = 'row-label note-label';
      label.addEventListener('click', () => this.handlers.previewRow(row));
      line.appendChild(label);
      this.noteLabels[row] = label;

      this.melodyCells[row] = [];
      for (let step = 0; step < STEPS; step++) {
        const cell = document.createElement('button');
        cell.className = 'cell note';
        cell.addEventListener('click', () => this.handlers.setMelody(step, row));
        line.appendChild(cell);
        this.melodyCells[row].push(cell);
      }
      box.appendChild(line);
    }
  }

  /** Make every cell match the song */
  render(song: Song): void {
    const indian = song.mode === 'indian';
    const steps = stepCount(song);
    const starts = beatStarts(song);
    const taal = TAALS[song.taal] ?? TAALS.teentaal;

    // Only show as many columns as the taal has matras
    this.gridEl.style.setProperty('--steps', String(steps));
    const columnHidden = (step: number) => step >= steps;

    // Taal markers row (Indian mode only)
    document.getElementById('taal-marks')!.classList.toggle('hidden', !indian);
    this.marks.forEach((mark, step) => {
      const index = starts.indexOf(step);
      mark.textContent = indian && index >= 0 ? taal.marks[index] : '';
      mark.className = 'mark' + (mark.textContent === 'X' ? ' sam' : mark.textContent === '0' ? ' khali' : '');
      mark.classList.toggle('gone', columnHidden(step));
    });

    // Step numbers, or bols in Indian mode
    this.numbers.forEach((n, step) => {
      n.textContent = indian ? bolAt(song, step) : String(step + 1);
      n.classList.toggle('beat', starts.includes(step));
      n.classList.toggle('bol', indian);
      n.classList.toggle('gone', columnHidden(step));
    });

    DRUM_IDS.forEach((id) => {
      const label = (indian ? INDIAN_LABELS : WESTERN_LABELS)[id];
      this.drumLabels[id].textContent = label;
      this.drumCells[id].forEach((cell, step) => {
        const on = song.drums[id][step];
        cell.classList.toggle('on', on);
        cell.classList.toggle('beat', starts.includes(step));
        cell.classList.toggle('gone', columnHidden(step));
        cell.setAttribute('aria-pressed', String(on));
        cell.setAttribute('aria-label', label.replace(/^\S+ /, '') + ' step ' + (step + 1));
      });
    });

    const notes = songNotes(song);
    for (let row = 0; row < MELODY_ROWS; row++) {
      const name = indian ? sargamName(notes[row], song.root) : noteName(notes[row]);
      this.noteLabels[row].textContent = name;
      this.noteLabels[row].classList.toggle('sa', indian && (notes[row] - song.root) % 12 === 0);
      this.noteLabels[row].setAttribute('aria-label', 'Play ' + name);
      this.melodyCells[row].forEach((cell, step) => {
        const on = song.melody[step] === row;
        cell.classList.toggle('on', on);
        cell.classList.toggle('beat', starts.includes(step));
        cell.classList.toggle('gone', columnHidden(step));
        cell.setAttribute('aria-pressed', String(on));
        cell.setAttribute('aria-label', name + ' step ' + (step + 1));
      });
    }
  }

  /** Light up the column that is playing right now */
  setPlayhead(step: number, song: Song | null): void {
    if (this.currentStep >= 0) {
      this.numbers[this.currentStep].classList.remove('now');
      this.columnCells(this.currentStep).forEach((cell) => cell.classList.remove('now'));
    }
    this.currentStep = step;
    if (step < 0 || !song) return;

    this.numbers[step].classList.add('now');
    this.columnCells(step).forEach((cell) => {
      cell.classList.add('now');
      if (cell.classList.contains('on')) {
        // Restart the "hit" flash animation
        cell.classList.remove('hit');
        void cell.offsetWidth;
        cell.classList.add('hit');
      }
    });
  }

  /** Glow the row matching the note you're singing */
  highlightRow(row: number): void {
    this.noteLabels.forEach((label, r) => label.classList.toggle('singing', r === row));
  }

  flashLabel(row: number): void {
    const label = this.noteLabels[row];
    label.classList.remove('pressed');
    void label.offsetWidth;
    label.classList.add('pressed');
  }

  private columnCells(step: number): HTMLButtonElement[] {
    const cells = DRUM_IDS.map((id) => this.drumCells[id][step]);
    this.melodyCells.forEach((row) => cells.push(row[step]));
    return cells;
  }
}
