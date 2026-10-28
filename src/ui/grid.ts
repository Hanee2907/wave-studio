// The step sequencer grid: 5 drum rows + 10 melody rows, 16 steps each

import { MELODY_ROWS, noteName, scaleNotes } from '../music';
import type { DrumId, Song } from '../song';
import { DRUM_IDS, STEPS } from '../song';

const DRUM_LABELS: Record<DrumId, string> = {
  kick: '🥁 Kick',
  snare: '🪘 Snare',
  hat: '🎩 Hi-hat',
  clap: '👏 Clap',
  bass: '🎸 Bass',
};

export interface GridHandlers {
  toggleDrum: (id: DrumId, step: number) => void;
  setMelody: (step: number, row: number) => void;
  previewRow: (row: number) => void;
}

export class Grid {
  private drumCells: Record<string, HTMLButtonElement[]> = {};
  private melodyCells: HTMLButtonElement[][] = []; // [row][step]
  private noteLabels: HTMLButtonElement[] = [];
  private numbers: HTMLElement[] = [];
  private currentStep = -1;

  constructor(private handlers: GridHandlers) {
    this.buildNumbers();
    this.buildDrums();
    this.buildMelody();
  }

  private buildNumbers(): void {
    const row = document.getElementById('step-numbers')!;
    row.appendChild(document.createElement('span')); // empty corner
    for (let step = 0; step < STEPS; step++) {
      const n = document.createElement('span');
      n.className = 'num' + (step % 4 === 0 ? ' beat' : '');
      n.textContent = String(step + 1);
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
      label.textContent = DRUM_LABELS[id];
      row.appendChild(label);

      this.drumCells[id] = [];
      for (let step = 0; step < STEPS; step++) {
        const cell = document.createElement('button');
        cell.className = 'cell' + (step % 4 === 0 ? ' beat' : '');
        cell.setAttribute('aria-label', DRUM_LABELS[id].split(' ')[1] + ' step ' + (step + 1));
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
        cell.className = 'cell note' + (step % 4 === 0 ? ' beat' : '');
        cell.addEventListener('click', () => this.handlers.setMelody(step, row));
        line.appendChild(cell);
        this.melodyCells[row].push(cell);
      }
      box.appendChild(line);
    }
  }

  /** Make every cell match the song */
  render(song: Song): void {
    DRUM_IDS.forEach((id) => {
      this.drumCells[id].forEach((cell, step) => {
        const on = song.drums[id][step];
        cell.classList.toggle('on', on);
        cell.setAttribute('aria-pressed', String(on));
      });
    });

    const notes = scaleNotes(song.root, song.scale);
    for (let row = 0; row < MELODY_ROWS; row++) {
      const name = noteName(notes[row]);
      this.noteLabels[row].textContent = name;
      this.noteLabels[row].setAttribute('aria-label', 'Play ' + name);
      this.melodyCells[row].forEach((cell, step) => {
        const on = song.melody[step] === row;
        cell.classList.toggle('on', on);
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
