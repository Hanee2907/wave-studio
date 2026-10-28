import './style.css';
import { applySettings, buildChain, type Chain } from './audio/chain';
import { playDrum, playNote } from './audio/play';
import { PitchListener } from './audio/pitch';
import { Scheduler, type StepEvent } from './audio/scheduler';
import { renderWav } from './audio/wav';
import { freqToMidi, NOTE_NAMES, noteName, sargamName, SCALES, snapToRow } from './music';
import {
  cloneSong, decodeSong, DRUM_IDS, encodeSong, PRESETS, songNotes, STEPS, stepCount, TAALS, thekaDrums, WAVES,
  type DrumId, type Mode, type Song, type Wave,
} from './song';
import { Grid } from './ui/grid';
import { Visualizer } from './ui/visualizer';
import { beatFromVoice } from './voicebeat';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;


// ================================
// Song state (loaded from a share link, the last session, or a preset)
// ================================

let openedSharedSong = false;
let song: Song = loadInitialSong();

function loadInitialSong(): Song {
  const match = location.hash.match(/song=([^&]+)/);
  if (match) {
    const shared = decodeSong(decodeURIComponent(match[1]));
    if (shared) {
      openedSharedSong = true;
      return shared;
    }
  }
  try {
    const saved = localStorage.getItem('wave-studio-song');
    const restored = saved ? decodeSong(saved) : null;
    if (restored) return restored;
  } catch {
    // Storage blocked (private mode) - just start fresh
  }
  return cloneSong(PRESETS.lofi.song);
}

function saveSong(): void {
  try {
    localStorage.setItem('wave-studio-song', encodeSong(song));
  } catch {
    // Not important if it fails
  }
}


// ================================
// Audio (created on the first click, because browsers block sound before that)
// ================================

let ctx: AudioContext | null = null;
let chain: Chain | null = null;
let scheduler: Scheduler | null = null;
let mic: PitchListener | null = null;

function audio(): { ctx: AudioContext; chain: Chain; scheduler: Scheduler; mic: PitchListener } {
  if (!ctx) {
    ctx = new AudioContext();
    chain = buildChain(ctx, song);
    scheduler = new Scheduler(ctx, () => chain!.input, () => song);
    mic = new PitchListener(ctx);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return { ctx, chain: chain!, scheduler: scheduler!, mic: mic! };
}

function currentNotes(): number[] {
  return songNotes(song);
}

/** Note name in the current style: C4 D4... or Sa Re Ga... */
function nameOf(midi: number): string {
  return song.mode === 'indian' ? sargamName(midi, song.root) : noteName(midi);
}

/** Play one melody row right now (keyboard, clicking a note name, or editing the grid) */
function playRow(row: number): void {
  const { ctx, chain } = audio();
  playNote(ctx, chain.input, song, currentNotes()[row], ctx.currentTime + 0.005, 0.45);
  grid.flashLabel(row);
}

function previewDrum(id: DrumId): void {
  const { ctx, chain } = audio();
  playDrum(ctx, chain.input, song, id, ctx.currentTime + 0.005);
}


// ================================
// UI pieces
// ================================

const viz = new Visualizer($<HTMLCanvasElement>('viz'));

const grid = new Grid({
  toggleDrum(id, step) {
    song.drums[id][step] = !song.drums[id][step];
    if (song.drums[id][step] && !scheduler?.playing) previewDrum(id);
    songChanged();
  },
  setMelody(step, row) {
    song.melody[step] = song.melody[step] === row ? -1 : row;
    if (song.melody[step] === row && !scheduler?.playing) playRow(row);
    songChanged();
  },
  previewRow: playRow,
});

let toastTimer = 0;
function toast(message: string): void {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('show'), 2800);
}

function songChanged(): void {
  grid.render(song);
  syncControls();
  saveSong();
  if (ctx && chain) applySettings(chain, song, ctx.currentTime);
}


// ================================
// Play / stop
// ================================

const playBtn = $<HTMLButtonElement>('play-btn');

function setPlaying(on: boolean): void {
  playBtn.classList.toggle('playing', on);
  playBtn.setAttribute('aria-label', on ? 'Stop' : 'Play');
  $('status-pill').textContent = on ? (recState === 'idle' ? '● Playing' : '● Recording') : '● Ready';
  $('status-pill').classList.toggle('live', on);
}

function togglePlay(): void {
  const { scheduler } = audio();
  if (scheduler.playing) {
    stop();
  } else {
    scheduler.start(false);
    setPlaying(true);
  }
}

function stop(): void {
  scheduler?.stop();
  if (recState !== 'idle') cancelRecording();
  setPlaying(false);
  grid.setPlayhead(-1, null);
  viz.setStep(-1);
  $('count-in').textContent = '';
}

playBtn.addEventListener('click', togglePlay);


// ================================
// 🎤 Sing a melody
// ================================

type RecState = 'idle' | 'countin' | 'recording';
let recState: RecState = 'idle';
let buckets: number[][] = [];       // the notes heard during each step
let levelBuckets: number[][] = [];  // how loud you sang during each step
let recStep = -1;
let melodyBackup: number[] | null = null;
let drumsBackup: Song['drums'] | null = null;

const micBtn = $<HTMLButtonElement>('mic-btn');
const recordBtn = $<HTMLButtonElement>('record-btn');
const undoBtn = $<HTMLButtonElement>('undo-btn');
const singStatus = $('sing-status');

micBtn.addEventListener('click', async () => {
  const { mic } = audio();
  if (mic.listening) {
    if (recState !== 'idle') stop();
    mic.stop();
    micBtn.textContent = '🎙️ Turn on microphone';
    micBtn.classList.remove('active');
    recordBtn.disabled = true;
    updateTuner(null);
    $('tuner-hint').textContent = 'Turn on your mic and sing or hum';
    return;
  }
  try {
    await mic.start();
    micBtn.textContent = '🎙️ Mic on';
    micBtn.classList.add('active');
    recordBtn.disabled = false;
    singStatus.textContent = 'Try humming. The big letter shows the note you\'re singing.';
  } catch {
    singStatus.textContent = 'Your microphone is blocked. Allow mic access in your browser to sing.';
  }
});

recordBtn.addEventListener('click', () => {
  if (recState !== 'idle') {
    stop();
    return;
  }
  const { scheduler } = audio();
  melodyBackup = song.melody.slice();
  song.melody = new Array(STEPS).fill(-1);
  grid.render(song);
  buckets = Array.from({ length: STEPS }, () => []);
  levelBuckets = Array.from({ length: STEPS }, () => []);
  drumsBackup = null;
  recStep = -1;
  recState = 'countin';
  scheduler.start(true);
  setPlaying(true);
  recordBtn.textContent = '⏹ Stop';
  recordBtn.classList.add('recording');
  undoBtn.classList.add('hidden');
  singStatus.textContent = 'Get ready... sing when the count ends!';
});

undoBtn.addEventListener('click', () => {
  if (!melodyBackup) return;
  song.melody = melodyBackup;
  melodyBackup = null;
  if (drumsBackup) {
    song.drums = drumsBackup;
    drumsBackup = null;
  }
  undoBtn.classList.add('hidden');
  songChanged();
  toast('↩ Your old song is back');
});

/** Pick the note sung during one step (the middle value ignores wobbles) */
function finishStep(step: number): void {
  const heard = buckets[step];
  if (!heard || heard.length < 3) {
    song.melody[step] = -1;
  } else {
    const sorted = heard.slice().sort((a, b) => a - b);
    const middle = sorted[Math.floor(sorted.length / 2)];
    song.melody[step] = snapToRow(middle, currentNotes());
  }
  grid.render(song);
}

function finishRecording(): void {
  recState = 'idle';
  recordBtn.textContent = '⏺ Record 1 bar';
  recordBtn.classList.remove('recording');
  setPlaying(true);
  const count = song.melody.filter((row) => row >= 0).length;
  if (count === 0) {
    singStatus.textContent = 'I didn\'t catch any notes. Try singing a little louder, closer to the mic.';
    if (melodyBackup) song.melody = melodyBackup;
  } else if ($<HTMLInputElement>('voice-beat').checked) {
    // Build drums that follow the rhythm you sang
    drumsBackup = JSON.parse(JSON.stringify(song.drums)) as Song['drums'];
    const beat = beatFromVoice(levelBuckets, song.melody, song);
    song.drums = beat.drums;
    const syllables = beat.onsets.filter(Boolean).length;
    const feel = { Chill: 'calm and chill', Groove: 'groovy', Energetic: 'full of energy' }[beat.style];
    singStatus.textContent = `🎉 Got ${count} notes and ${syllables} syllables. Your singing felt ${feel}, so here's ${beat.style === 'Energetic' ? 'an' : 'a'} ${beat.style.toLowerCase()} beat that follows your rhythm!`;
    undoBtn.classList.remove('hidden');
    toast(`🥁 ${beat.style} beat built from your voice!`);
  } else {
    singStatus.textContent = `🎉 Got ${count} notes! Your voice is now the melody. Change the synth wave to hear it in new ways.`;
    undoBtn.classList.remove('hidden');
    toast('🎤 Your melody is on the grid!');
  }
  songChanged();
}

function cancelRecording(): void {
  if (melodyBackup) song.melody = melodyBackup;
  recState = 'idle';
  recordBtn.textContent = '⏺ Record 1 bar';
  recordBtn.classList.remove('recording');
  singStatus.textContent = 'Recording stopped. Your old melody is safe.';
  songChanged();
}

function updateTuner(freq: number | null): void {
  const note = $('tuner-note');
  const needle = $('cents-needle');
  if (!freq) {
    note.textContent = '–';
    note.classList.remove('in-tune');
    needle.style.opacity = '0';
    if (mic?.listening) $('tuner-hint').textContent = 'Listening...';
    grid.highlightRow(-1);
    return;
  }
  const midi = freqToMidi(freq);
  const cents = Math.round((midi - Math.round(midi)) * 100);
  const inTune = Math.abs(cents) < 15;

  note.textContent = nameOf(midi);
  note.classList.toggle('in-tune', inTune);
  needle.style.opacity = '1';
  needle.style.left = 50 + cents + '%';
  $('tuner-hint').textContent = inTune ? '✓ Right on the note' : cents > 0 ? 'A little high' : 'A little low';
  grid.highlightRow(snapToRow(midi, currentNotes()));
}


// ================================
// Every frame: light up steps, listen to the mic, draw the visualizer
// ================================

function onStep(event: StepEvent): void {
  const countIn = $('count-in');

  if (event.countIn) {
    if (event.step % 4 === 0) {
      countIn.textContent = String(4 - event.step / 4);
      countIn.classList.remove('beat');
      void countIn.offsetWidth;
      countIn.classList.add('beat');
    }
    viz.setStep(event.step);
    return;
  }
  countIn.textContent = '';

  if (recState === 'countin') {
    recState = 'recording';
    setPlaying(true);
    singStatus.textContent = '🎤 Sing now! Follow the glowing column.';
  } else if (recState === 'recording') {
    finishStep(recStep);
    if (event.step === 0) finishRecording();
  }
  if (recState === 'recording') recStep = event.step;

  grid.setPlayhead(event.step, song);
  viz.setStep(event.step);
  if (song.drums.kick[event.step]) viz.kick();
}

// Steps and the mic are checked on a timer (not the drawing loop), because
// browsers pause drawing in hidden tabs but the music keeps playing.
function tick(): void {
  if (ctx && scheduler) {
    const queue = scheduler.queue;
    while (queue.length > 0 && queue[0].time <= ctx.currentTime) {
      onStep(queue.shift()!);
    }
  }

  if (mic?.listening) {
    const freq = mic.read();
    updateTuner(freq);
    if (recState === 'recording' && recStep >= 0) {
      levelBuckets[recStep].push(mic.level);
      if (freq) buckets[recStep].push(freqToMidi(freq));
    }
  }
}

function frame(now: number): void {
  viz.draw(chain?.analyser ?? null, now);
  requestAnimationFrame(frame);
}


// ================================
// Controls
// ================================

function bindRange(id: string, read: () => number, write: (value: number) => void): void {
  $<HTMLInputElement>(id).addEventListener('input', (event) => {
    write(Number((event.target as HTMLInputElement).value));
    songChanged();
  });
  $<HTMLInputElement>(id).value = String(read());
}

bindRange('bpm', () => song.bpm, (v) => { song.bpm = v; });
bindRange('swing', () => song.swing * 100, (v) => { song.swing = v / 100; });
bindRange('volume', () => song.volume * 100, (v) => { song.volume = v / 100; });
bindRange('cutoff', () => song.cutoff, (v) => { song.cutoff = v; });
bindRange('reverb', () => song.reverb * 100, (v) => { song.reverb = v / 100; });
bindRange('delay', () => song.delay * 100, (v) => { song.delay = v / 100; });

// Presets
const presetSelect = $<HTMLSelectElement>('preset');
presetSelect.addEventListener('change', () => {
  const preset = PRESETS[presetSelect.value];
  if (!preset) return;
  song = cloneSong(preset.song);
  songChanged();
  toast(`🎶 Loaded "${preset.name}"`);
  presetSelect.value = '';
});

// Key: each note picked so the grid sits in a comfy singing range
const keySelect = $<HTMLSelectElement>('key-select');
keySelect.addEventListener('change', () => {
  song.root = Number(keySelect.value);
  songChanged();
});

const scaleSelect = $<HTMLSelectElement>('scale-select');
scaleSelect.addEventListener('change', () => {
  song.scale = scaleSelect.value;
  songChanged();
});

// Wave shape buttons with little drawings of each wave
const WAVE_PATHS: Record<Wave, string> = {
  sine: 'M2 12 Q8 0 14 12 T26 12 T38 12',
  triangle: 'M2 12 L8 3 L20 21 L32 3 L38 12',
  square: 'M2 18 V6 H11 V18 H20 V6 H29 V18 H38',
  sawtooth: 'M2 18 L14 6 V18 L26 6 V18 L38 6',
  sitar: 'M2 12 Q5 0 8 12 T14 12 Q17 4 20 12 T26 12 Q28 8 30 12 T34 12 L38 12',
};
const wavePicker = $('wave-picker');
WAVES.forEach((wave) => {
  const button = document.createElement('button');
  button.className = 'wave-btn';
  button.dataset.wave = wave;
  button.setAttribute('role', 'radio');
  button.innerHTML = `<svg viewBox="0 0 40 24" aria-hidden="true"><path d="${WAVE_PATHS[wave]}"/></svg><span>${wave === 'sawtooth' ? 'saw' : wave}</span>`;
  button.addEventListener('click', () => {
    song.wave = wave;
    songChanged();
    playRow(4);
  });
  wavePicker.appendChild(button);
});

function syncControls(): void {
  const set = (id: string, value: number) => { $<HTMLInputElement>(id).value = String(value); };
  set('bpm', song.bpm);
  set('swing', Math.round(song.swing * 100));
  set('volume', Math.round(song.volume * 100));
  set('cutoff', song.cutoff);
  set('reverb', Math.round(song.reverb * 100));
  set('delay', Math.round(song.delay * 100));

  $('bpm-value').textContent = String(song.bpm);
  $('swing-value').textContent = Math.round(song.swing * 100) + '%';
  $('volume-value').textContent = Math.round(song.volume * 100) + '%';
  $('cutoff-value').textContent = song.cutoff >= 1000 ? (song.cutoff / 1000).toFixed(1) + ' kHz' : song.cutoff + ' Hz';
  $('reverb-value').textContent = Math.round(song.reverb * 100) + '%';
  $('delay-value').textContent = Math.round(song.delay * 100) + '%';

  syncMode();
  keySelect.value = String(song.root);
  scaleSelect.value = song.scale;
  taalSelect.value = song.taal;
  droneBox.checked = song.drone;
  wavePicker.querySelectorAll<HTMLButtonElement>('.wave-btn').forEach((b) => {
    const on = b.dataset.wave === song.wave;
    b.classList.toggle('selected', on);
    b.setAttribute('aria-checked', String(on));
  });

  const scale = SCALES[song.scale];
  if (song.mode === 'indian') {
    const taalName = (TAALS[song.taal] ?? TAALS.teentaal).name.split(' ·')[0];
    $('song-meta').textContent = `${scale.name.split(' ·')[0]} · ${taalName} · Sa = ${NOTE_NAMES[song.root % 12]} · ${song.bpm} BPM`;
    $('raga-mood').textContent = scale.mood ? '🕰️ ' + scale.mood : '';
  } else {
    $('song-meta').textContent = `${NOTE_NAMES[song.root % 12]} ${scale.name.split(' ·')[0].toLowerCase()} · ${song.bpm} BPM`;
    $('raga-mood').textContent = '';
  }
}


// ================================
// 🎹 Western / 🪕 Indian mode
// ================================

const taalSelect = $<HTMLSelectElement>('taal-select');
taalSelect.innerHTML = Object.entries(TAALS).map(([id, t]) => `<option value="${id}">${t.name}</option>`).join('');
taalSelect.addEventListener('change', () => {
  song.taal = taalSelect.value;
  song.drums = thekaDrums(song.taal); // load the classic theka for this taal
  songChanged();
  toast(`🪘 ${TAALS[song.taal].name} theka loaded`);
});

const droneBox = $<HTMLInputElement>('drone');
droneBox.addEventListener('change', () => {
  song.drone = droneBox.checked;
  songChanged();
});

let shownMode: Mode | null = null;

/** Rebuild the menus and colours when the music style changes */
function syncMode(): void {
  const indian = song.mode === 'indian';
  document.body.classList.toggle('indian', indian);
  viz.setStyle(indian, stepCount(song));

  document.querySelectorAll<HTMLButtonElement>('#mode-switch button').forEach((b) => {
    const on = b.dataset.mode === song.mode;
    b.classList.toggle('selected', on);
    b.setAttribute('aria-checked', String(on));
  });

  if (shownMode === song.mode) return;
  shownMode = song.mode;

  presetSelect.innerHTML = '<option value="">' + (indian ? 'Choose a raga tune…' : 'Choose a preset…') + '</option>' +
    Object.entries(PRESETS)
      .filter(([, p]) => p.mode === song.mode)
      .map(([id, p]) => `<option value="${id}">${p.name}</option>`).join('');

  $('key-label').textContent = indian ? 'Sa (your key)' : 'Key';
  keySelect.innerHTML = NOTE_NAMES.map((name, pc) => {
    const root = pc <= 5 ? 60 + pc : 48 + pc;
    return `<option value="${root}">${indian ? 'Sa = ' + name : name}</option>`;
  }).join('');

  $('scale-label').textContent = indian ? 'Raga' : 'Scale';
  scaleSelect.innerHTML = Object.entries(SCALES)
    .filter(([, scale]) => !!scale.indian === indian)
    .map(([id, scale]) => `<option value="${id}">${scale.name}</option>`).join('');
}

document.querySelectorAll<HTMLButtonElement>('#mode-switch button').forEach((button) => {
  button.addEventListener('click', () => {
    const mode = button.dataset.mode as Mode;
    if (mode === song.mode) return;
    const preset = mode === 'indian' ? PRESETS.yaman : PRESETS.lofi;
    song = cloneSong(preset.song);
    songChanged();
    toast(mode === 'indian' ? '🪕 Namaste! Indian mode: ' + preset.name : '🎹 Western mode: ' + preset.name);
  });
});

$('clear-drums').addEventListener('click', () => {
  DRUM_IDS.forEach((id) => { song.drums[id] = new Array(STEPS).fill(false); });
  songChanged();
});

$('clear-melody').addEventListener('click', () => {
  song.melody = new Array(STEPS).fill(-1);
  songChanged();
});


// ================================
// Share link + WAV export
// ================================

$('share-btn').addEventListener('click', async () => {
  const url = `${location.origin}${location.pathname}#song=${encodeSong(song)}`;
  history.replaceState(null, '', url);
  try {
    await navigator.clipboard.writeText(url);
    toast('🔗 Link copied! Send it to a friend to hear your song');
  } catch {
    toast('🔗 Your song is in the address bar. Copy it to share!');
  }
});

const exportBtn = $<HTMLButtonElement>('export-btn');
exportBtn.addEventListener('click', async () => {
  exportBtn.disabled = true;
  exportBtn.textContent = '⏳ Rendering...';
  try {
    const blob = await renderWav(song);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'wave-studio-loop.wav';
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 2000);
    toast('⤓ Your loop was saved as a WAV file');
  } catch {
    toast('Sorry, export did not work in this browser');
  }
  exportBtn.disabled = false;
  exportBtn.textContent = '⤓ Export WAV';
});


// ================================
// Keyboard: play notes with A S D F G H J K L ;  and Space to play/stop
// ================================

const KEY_ROWS = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';'];

document.addEventListener('keydown', (event) => {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  const target = event.target as HTMLElement;
  if (target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') return;

  if (event.code === 'Space') {
    if (target.tagName === 'BUTTON') return; // Space already clicks buttons
    event.preventDefault();
    togglePlay();
    return;
  }

  const row = KEY_ROWS.indexOf(event.key.toLowerCase());
  if (row >= 0) playRow(row);
});


// ================================
// Start
// ================================

songChanged();
window.setInterval(tick, 15);
requestAnimationFrame(frame);
if (openedSharedSong) toast('🎧 Someone shared a song with you. Press play!');
