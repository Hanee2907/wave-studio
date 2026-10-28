# 🎛️ Wave Studio – Make beats. Sing melodies. Share songs.

**🌐 Live demo: https://hanee2907.github.io/wave-studio/**

Wave Studio is a music studio that runs in your browser.
Every single sound (drums, bass and synths) is generated live with code using the Web Audio API.
There are no samples and no audio files.

## ✨ Highlights

### 🎤 Sing a melody
Turn on your microphone, sing or hum for one bar, and Wave Studio turns your voice into notes on the grid.

- A live tuner shows the note you're singing and whether you're a little high or low
- A 4-beat count-in, then a glowing column shows you where to sing
- Notes are snapped to the key you chose, so it always sounds musical
- Deep or high voices are moved by octaves to fit the grid
- Undo brings back your old melody

### 🥁 Beat from my voice
While you sing, Wave Studio also listens to your *rhythm*, and builds a drum beat that fits it.

- It finds every syllable you start (new notes and sudden jumps in loudness)
- Few, gentle syllables → a **Chill** half-time beat
- A steady flow → a **Groove** backbeat
- Lots of fast, strong syllables → an **Energetic** four-on-the-floor beat
- Extra kicks land on your strongest off-beat syllables, hi-hats tick along with your words, and the bass joins at the start of each phrase

### 🥁 Beat grid
- 16-step sequencer with kick, snare, hi-hat, clap and bass
- 10-row melody piano roll in any key and scale (major, minor, pentatonic, blues)
- Tempo, swing and volume controls
- Presets: Lo-fi chill, Pop bounce, Synthwave night

### 🔊 Sound design
- 4 synth waves: sine, triangle, square and saw
- Brightness filter, reverb and tempo-synced echo
- Play notes live with your keyboard (`A` to `;`), `Space` to play and stop

### 🔗 Share and export
- **Share link:** the whole song is packed into about 80 characters in the URL, so friends can open it and remix it
- **Export WAV:** renders your loop faster than real time and saves it as a .wav file

### 🌈 Visualizer
A neon ring of frequency bars, a live waveform, a step ring, and sparks on every kick drum.

## 🧠 How it works

| Part | How |
|---|---|
| Timing | A look-ahead scheduler books notes on the audio clock 120 ms ahead, so the beat stays tight even when the page is busy |
| Instruments | Oscillators and filtered noise with volume envelopes (kick = falling sine, hat = high-passed noise, clap = 3 noise bursts...) |
| Effects | Filter → compressor chain, a convolution reverb made from fading noise, and a feedback delay |
| Pitch detection | Normalised autocorrelation finds the repeating cycle in your voice, with parabolic interpolation for accuracy |
| Beat from voice | Onset detection from note changes and loudness jumps, then rule-based drum placement by energy level |
| WAV export | `OfflineAudioContext` renders the loop, then the samples are written into the WAV format by hand |
| Share links | The song is packed into a compact string: drum steps as hex bit-masks, melody as base-36 digits |

## 🛠️ Built with

- TypeScript (strict mode)
- Vite
- Web Audio API, MediaDevices (microphone), Canvas 2D
- CSS3 (glassmorphism, custom range sliders, animations, responsive grid)
- Fonts: [Unbounded](https://fonts.google.com/specimen/Unbounded) and [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk)

## 🚀 Run it locally

```bash
npm install
npm run dev
```

Build for production with `npm run build`, and publish to GitHub Pages with `npm run deploy`.

## 📁 Project structure

```
src/
├── main.ts            # Connects the UI, audio and recording
├── music.ts           # Notes, scales and frequency maths
├── song.ts            # Song data, presets and share links
├── voicebeat.ts       # Builds a drum beat from the rhythm of your singing
├── style.css
├── audio/
│   ├── chain.ts       # Effects chain (filter, reverb, echo, compressor)
│   ├── instruments.ts # Drum and synth sounds made from oscillators and noise
│   ├── play.ts        # Plays one step of the song
│   ├── scheduler.ts   # Look-ahead scheduler for tight timing
│   ├── pitch.ts       # Microphone pitch detection
│   └── wav.ts         # Offline rendering and WAV export
└── ui/
    ├── grid.ts        # Step sequencer grid
    └── visualizer.ts  # Canvas visualizer
```
