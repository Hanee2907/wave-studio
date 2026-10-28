# 🎛️ Wave Studio – Make beats. Sing melodies. Share songs.

**🌐 Live demo: https://hanee2907.github.io/wave-studio/**

Wave Studio is a music studio that runs in your browser, for **Western and Indian music**.
Every single sound (drums, tabla, bass, sitar, tanpura and synths) is generated live with code using the Web Audio API.
There are no samples and no audio files.

## 🪕 Indian mode

Switch to **🪕 Indian** at the top and the whole studio speaks Indian music:

- **15 ragas** with their Carnatic names: Yaman (Kalyani), Bhupali (Mohanam), Bhairav (Mayamalavagowla), Bhairavi, Bilawal (Shankarabharanam), Kafi (Kharaharapriya), Khamaj, Desh, Todi, Darbari Kanada, Marwa, Durga, Malkauns (Hindolam), Hamsadhwani and Shivranjani, each showing its time of day and mood
- **Sargam everywhere:** the grid and the live tuner show Sa Re Ga Ma Pa Dha Ni, with komal (k) and tivra (t) notes and octave dots (Ṇi, Ṡa)
- **7 taals:** Teentaal (16), Keherwa (8), Dadra (6), Rupak (7), Jhaptaal (10), Ektaal (12) and Carnatic Adi talam, with sam (X), khali (0) and tali markers, and the grid resizes to the taal
- **Tabla made with code:** Ge (bayan with its pitch slide), Na and Tin (dayan tuned to your Sa, with real harmonic overtones), Ke, plus manjira. The grid shows the bols (Dha, Dhin, Na, Tin...) as you build
- **Tanpura drone:** Pa–Sa–Sa–Sa strings that restart with every taal cycle, to sing along with
- **Sitar sound:** a plucked string made with the Karplus-Strong algorithm, with meend (a little slide into each note)
- **Raga tunes:** ready-made loops built from each raga's pakad (its signature phrase)
- **Beat from my voice** builds on the taal's theka: gentle singing gives a sparse theka, lively singing adds Ge and Ke strokes on your syllables, and khali always stays khali

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
| Tabla | Bayan = sine with an upward pitch slide; dayan = harmonic partials tuned to Sa plus a finger click |
| Sitar | Karplus-Strong: a noise burst circulating in a delay loop one wave-length long, soft-clipped for buzz |
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
├── music.ts           # Notes, scales, ragas, sargam and frequency maths
├── song.ts            # Song data, taals, presets and share links
├── voicebeat.ts       # Builds a beat (or a tabla theka) from the rhythm of your singing
├── style.css
├── audio/
│   ├── chain.ts       # Effects chain (filter, reverb, echo, compressor)
│   ├── instruments.ts # Drums, tabla, manjira, tanpura, sitar and synths made with code
│   ├── play.ts        # Plays one step of the song
│   ├── scheduler.ts   # Look-ahead scheduler for tight timing
│   ├── pitch.ts       # Microphone pitch detection
│   └── wav.ts         # Offline rendering and WAV export
└── ui/
    ├── grid.ts        # Step sequencer grid
    └── visualizer.ts  # Canvas visualizer
```
