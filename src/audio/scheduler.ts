// A "look-ahead" scheduler.
//
// JavaScript timers are not precise enough for music, but the audio clock is.
// So every 25 ms we wake up and book all notes for the next 120 ms on the
// audio clock. The beat stays perfectly tight even if the page is busy.

import type { Song } from '../song';
import { STEPS } from '../song';
import { click } from './instruments';
import { playStep, stepLength, swingOffset } from './play';

const LOOK_AHEAD = 0.12; // seconds of music booked in advance
const TICK = 25;         // ms between wake-ups

export interface StepEvent {
  step: number;
  time: number;
  countIn: boolean;
}

export class Scheduler {
  private timer: number | null = null;
  private nextTime = 0;
  private step = 0;
  private countInSteps = 0;

  /** Steps that have been booked, so the screen can light up at the right moment */
  readonly queue: StepEvent[] = [];

  constructor(
    private ctx: AudioContext,
    private out: () => AudioNode,
    private song: () => Song,
  ) {}

  get playing(): boolean {
    return this.timer !== null;
  }

  /** Start playing. With countIn, one bar of clicks plays first. */
  start(countIn = false): void {
    this.stop();
    this.step = 0;
    this.countInSteps = countIn ? STEPS : 0;
    this.nextTime = this.ctx.currentTime + 0.06;
    this.timer = window.setInterval(() => this.tick(), TICK);
    this.tick();
  }

  stop(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.queue.length = 0;
  }

  private tick(): void {
    const song = this.song();
    while (this.nextTime < this.ctx.currentTime + LOOK_AHEAD) {
      const countIn = this.countInSteps > 0;

      if (countIn) {
        // Click on every beat (every 4 steps)
        const beatStep = STEPS - this.countInSteps;
        if (beatStep % 4 === 0) click(this.ctx, this.out(), this.nextTime, beatStep === 0);
        this.queue.push({ step: beatStep, time: this.nextTime, countIn: true });
        this.countInSteps--;
      } else {
        const time = this.nextTime + swingOffset(song, this.step);
        playStep(this.ctx, this.out(), song, this.step, time);
        this.queue.push({ step: this.step, time, countIn: false });
        this.step = (this.step + 1) % STEPS;
      }

      this.nextTime += stepLength(song);
    }
  }
}
