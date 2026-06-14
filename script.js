"use strict";

// Twelve-tone equal temperament, A4 = 440 Hz. MIDI note 69 == A4.
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const WHITE_OFFSETS = new Set([0, 2, 4, 5, 7, 9, 11]); // semitone offsets that are white keys

// Computer-keyboard row mapped to consecutive semitones, starting at the piano's first note.
const KEY_ROW = ["a", "w", "s", "e", "d", "f", "t", "g", "y", "h", "u", "j", "k", "o", "l", "p", ";", "'"];

// Auto-play songs. `notes` is an absolute-time list of [midi, startSeconds, durationSeconds]
// triples. Entries without `notes` render as locked placeholders. ReawakeR is the single-voice
// lead line of the Solo Leveling S2 opening - the top melodic line lifted from the community
// transcription at onlinesequencer.net/4589659, made monophonic and dropped two octaves.
const REAWAKER_NOTES = [
  [66,0.3,0.9],[62,1.2,0.9],[62,2.1,0.48],[59,2.58,0.9],[59,3.48,0.45],[64,4.38,0.9],[64,5.28,0.45],[71,5.99,0.22],
  [71,6.21,0.22],[69,6.34,0.35],[71,6.44,0.22],[71,6.66,0.9],[69,7.01,0.61],[66,7.36,0.26],[71,7.84,0.22],[71,8.06,0.22],
  [71,8.28,0.26],[69,8.41,0.13],[71,8.54,0.9],[69,8.89,0.58],[66,9.24,0.23],[66,9.69,0.35],[66,10.04,0.13],[66,10.17,0.23],
  [66,10.4,0.22],[66,10.62,0.22],[66,10.84,0.35],[64,11.1,0.22],[66,11.2,0.13],[66,11.55,0.35],[66,11.9,0.13],[66,12.03,0.22],
  [66,12.25,0.22],[66,12.47,0.22],[66,12.69,0.35],[64,12.95,0.23],[66,13.05,0.13],[62,13.18,0.9],[66,13.4,0.9],[71,13.66,0.45],
  [71,14.11,0.71],[69,14.59,0.48],[71,14.82,0.26],[64,15.04,0.9],[69,15.26,0.26],[69,15.52,0.9],[66,15.74,0.9],[71,15.96,0.71],
  [69,16.44,0.45],[71,16.67,0.22],[66,16.89,0.9],[71,17.15,0.45],[70,17.37,0.9],[71,17.59,0.48],[71,18.07,0.9],[70,18.29,0.67],
  [66,18.52,0.45],[62,19.42,0.22],[62,20.32,0.35],[66,21.22,0.26],[66,22.12,0.35],[66,22.47,0.13],[64,23.05,0.26],[64,23.95,0.32],
  [64,24.27,0.13],[59,24.85,0.26],[59,25.75,0.35],[62,26.2,0.48],[62,26.68,0.22],[62,27.58,0.35],[66,28.48,0.22],[66,29.38,0.35],
  [64,30.28,0.26],[64,31.18,0.35],[64,31.53,0.13],[64,32.11,0.35],[64,32.46,0.13],[64,32.59,0.67],[59,33.04,0.48],[64,33.26,0.26],
  [62,33.52,0.45],[66,33.97,0.13],[66,34.1,0.13],[66,34.32,0.13],[66,34.45,0.23],[66,34.68,0.48],[62,34.9,0.35],[66,35.25,0.13],
  [66,35.38,0.23],[66,35.6,0.22],[66,35.82,0.26],[66,36.72,0.35],[66,37.07,0.13],[64,37.68,0.22],[69,38,0.13],[69,38.13,0.9],
  [66,38.35,0.7],[64,38.61,0.35],[71,38.83,0.13],[71,39.05,0.22],[71,39.27,0.48],[59,39.53,0.22],[59,40.43,0.35],[62,40.88,0.48],
  [62,41.36,0.22],[66,41.46,0.13],[66,41.81,0.26],[66,42.07,0.45],[62,42.29,0.35],[66,42.51,0.13],[66,42.74,0.26],[66,43,0.22],
  [66,43.22,0.23],[66,44.12,0.35],[64,45.02,0.23],[69,45.37,0.13],[69,45.5,0.9],[66,45.73,0.7],[64,45.95,0.35],[71,46.17,0.13],
  [71,46.3,0.13],[71,46.43,0.22],[71,46.65,0.48],[64,46.87,0.26],[64,47.22,0.13],[64,47.35,0.7],[59,47.8,0.48],[64,48.05,0.23],
  [62,48.27,0.9],[62,49.17,0.7],[62,49.87,0.22],[66,50.77,0.7],[66,51.47,0.22],[64,51.69,0.71],[64,52.4,0.22],[64,52.62,0.7],
  [64,53.32,0.22],[59,54.22,0.7],[59,54.92,0.22],[62,55.14,0.9],[62,56.04,0.67],[62,56.71,0.22],[66,57.61,0.67],[66,58.28,0.22],
  [64,58.54,0.9],[64,59.44,0.7],[64,60.14,0.22],[64,61.04,0.7],[64,61.74,0.22],[62,62.32,0.13],[66,62.77,0.13],[66,62.9,0.22],
  [66,63.12,0.48],[66,63.6,0.22],[62,63.7,0.13],[66,64.6,0.8],[66,65.4,0.13],[64,65.98,0.13],[69,66.33,0.13],[64,66.46,0.9],
  [69,66.56,0.9],[66,66.82,0.7],[71,67.27,0.26],[59,67.4,0.13],[69,67.75,0.26],[59,67.85,0.13],[69,68.2,0.13],[69,68.33,0.9],
  [68,68.46,0.9],[66,68.68,0.67],[59,69.13,0.23],
];

const SONGS = [
  { title: "Solo Leveling — ReawakeR", subtitle: "LiSA feat. Felix · lead line (1 finger)", notes: REAWAKER_NOTES },
  { title: "Placeholder 2" },
  { title: "Placeholder 3" },
  { title: "Placeholder 4" },
  { title: "Placeholder 5" },
  { title: "Placeholder 6" },
  { title: "Placeholder 7" },
  { title: "Placeholder 8" },
  { title: "Placeholder 9" },
  { title: "Placeholder 10" },
];

const piano = document.getElementById("piano");
const octaveCountInput = document.getElementById("octaveCount");
const startOctaveInput = document.getElementById("startOctave");
const showLabelsInput = document.getElementById("showLabels");
const volumeInput = document.getElementById("volume");
const songsBtn = document.getElementById("songsBtn");
const songsModal = document.getElementById("songsModal");
const songList = document.getElementById("songList");
const nowPlaying = document.getElementById("nowPlaying");
const nowPlayingLabel = document.getElementById("nowPlayingLabel");
const stopBtn = document.getElementById("stopBtn");

const audio = createAudioEngine();

// Maps a built key element id -> its MIDI number, and the inverse for keyboard input.
let keyElements = new Map();
let codeToMidi = new Map();
const activePointerNotes = new Map(); // pointerId -> midi currently sounding
const heldKeyboardNotes = new Set(); // midi notes held via computer keyboard

let autoplayTimers = []; // pending setTimeout ids for the current auto-play
const autoplayNotes = new Set(); // midi notes currently sounded by auto-play
let savedKeyboard = null; // user's octave layout, saved while a song retunes the keyboard

buildKeyboard();
wireControls();
wirePointer();
wireComputerKeyboard();
wireSongs();
showVersion();

// ---------- Keyboard construction ----------

function buildKeyboard() {
  const startMidi = 12 * (Number(startOctaveInput.value) + 1); // C of the chosen octave
  const octaves = Number(octaveCountInput.value);
  const totalSemitones = octaves * 12 + 1; // include the trailing C to close the last octave

  piano.innerHTML = "";
  keyElements = new Map();
  codeToMidi = new Map();

  // First pass: white keys establish the layout; black keys are positioned over them.
  const whiteKeys = [];
  for (let i = 0; i < totalSemitones; i++) {
    const midi = startMidi + i;
    if (WHITE_OFFSETS.has(midi % 12)) {
      whiteKeys.push(createKey(midi, false));
    }
  }
  whiteKeys.forEach((el) => piano.appendChild(el));

  // Black keys overlay between the appropriate white keys.
  const whiteWidthPct = 100 / whiteKeys.length;
  let whiteIndex = 0;
  for (let i = 0; i < totalSemitones; i++) {
    const midi = startMidi + i;
    const offset = midi % 12;
    if (WHITE_OFFSETS.has(offset)) {
      whiteIndex++;
      continue;
    }
    const black = createKey(midi, true);
    black.style.left = `${whiteIndex * whiteWidthPct}%`;
    black.style.width = `${whiteWidthPct * 0.62}%`;
    piano.appendChild(black);
  }

  assignComputerKeys(startMidi);
  applyLabelVisibility();
}

function createKey(midi, isBlack) {
  const el = document.createElement("div");
  el.className = `key ${isBlack ? "key--black" : "key--white"}`;
  el.dataset.midi = String(midi);
  el.id = `key-${midi}`;

  const label = document.createElement("span");
  label.className = "key__label";
  label.textContent = noteLabel(midi);
  el.appendChild(label);

  keyElements.set(midi, el);
  return el;
}

function assignComputerKeys(startMidi) {
  KEY_ROW.forEach((char, i) => {
    const midi = startMidi + i;
    if (keyElements.has(midi)) {
      codeToMidi.set(char, midi);
    }
  });
}

function noteLabel(midi) {
  const name = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

// ---------- Controls ----------

function wireControls() {
  octaveCountInput.addEventListener("input", buildKeyboard);
  startOctaveInput.addEventListener("change", buildKeyboard);
  showLabelsInput.addEventListener("change", applyLabelVisibility);
  volumeInput.addEventListener("input", () => audio.setVolume(Number(volumeInput.value) / 100));
  audio.setVolume(Number(volumeInput.value) / 100);
}

function applyLabelVisibility() {
  piano.classList.toggle("hide-labels", !showLabelsInput.checked);
}

// Mirror the script's cache-bust query (?v=N) next to the title, so the visible
// version always matches the deployed asset — one source of truth in index.html.
function showVersion() {
  const el = document.getElementById("version");
  if (!el) return;
  const script = document.querySelector('script[src*="script.js"]');
  const v = script ? new URL(script.src).searchParams.get("v") : null;
  el.textContent = v ? `v${v}` : "";
}

// ---------- Pointer (touch + mouse) input ----------

function wirePointer() {
  piano.addEventListener("pointerdown", onPointerDown);
  piano.addEventListener("pointermove", onPointerMove);
  piano.addEventListener("pointerup", onPointerUp);
  piano.addEventListener("pointercancel", onPointerUp);
  piano.addEventListener("pointerleave", onPointerUp);
  // Prevent the page from scrolling / selecting while playing.
  piano.addEventListener("contextmenu", (e) => e.preventDefault());
}

function onPointerDown(e) {
  const midi = midiFromPoint(e.clientX, e.clientY);
  if (midi === null) return;
  e.preventDefault();
  // Allow sliding across keys with this finger.
  if (piano.setPointerCapture) {
    try {
      piano.releasePointerCapture(e.pointerId);
    } catch {}
  }
  startPointerNote(e.pointerId, midi);
}

function onPointerMove(e) {
  if (!activePointerNotes.has(e.pointerId)) return;
  const midi = midiFromPoint(e.clientX, e.clientY);
  const current = activePointerNotes.get(e.pointerId);
  if (midi === current) return;
  stopPointerNote(e.pointerId);
  if (midi !== null) startPointerNote(e.pointerId, midi);
}

function onPointerUp(e) {
  stopPointerNote(e.pointerId);
}

function startPointerNote(pointerId, midi) {
  activePointerNotes.set(pointerId, midi);
  noteOn(midi);
}

function stopPointerNote(pointerId) {
  if (!activePointerNotes.has(pointerId)) return;
  const midi = activePointerNotes.get(pointerId);
  activePointerNotes.delete(pointerId);
  // Only silence if no other input is holding the same note.
  if (!isNoteHeldElsewhere(midi, pointerId)) noteOff(midi);
}

function midiFromPoint(x, y) {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  const key = el.closest(".key");
  if (!key || !piano.contains(key)) return null;
  return Number(key.dataset.midi);
}

// ---------- Computer keyboard input ----------

function wireComputerKeyboard() {
  window.addEventListener("keydown", (e) => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    const midi = codeToMidi.get(e.key.toLowerCase());
    if (midi === undefined || heldKeyboardNotes.has(midi)) return;
    heldKeyboardNotes.add(midi);
    noteOn(midi);
  });

  window.addEventListener("keyup", (e) => {
    const midi = codeToMidi.get(e.key.toLowerCase());
    if (midi === undefined) return;
    heldKeyboardNotes.delete(midi);
    if (!isNoteHeldElsewhere(midi, null)) noteOff(midi);
  });
}

function isNoteHeldElsewhere(midi, exceptPointerId) {
  if (heldKeyboardNotes.has(midi)) return true;
  for (const [pointerId, heldMidi] of activePointerNotes) {
    if (pointerId === exceptPointerId) continue;
    if (heldMidi === midi) return true;
  }
  return false;
}

// ---------- Note on/off + visuals ----------

function noteOn(midi) {
  audio.noteOn(midi);
  const el = keyElements.get(midi);
  if (el) el.classList.add("is-active");
}

function noteOff(midi) {
  audio.noteOff(midi);
  const el = keyElements.get(midi);
  if (el) el.classList.remove("is-active");
}

// ---------- Auto-play (songs modal) ----------

function wireSongs() {
  buildSongList();
  songsBtn.addEventListener("click", openSongsModal);
  stopBtn.addEventListener("click", stopAutoplay);
  songsModal.addEventListener("click", (e) => {
    if (e.target.hasAttribute("data-close")) closeSongsModal();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !songsModal.hidden) closeSongsModal();
  });
}

function buildSongList() {
  songList.innerHTML = "";
  SONGS.forEach((song, i) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.className = "song-item";
    btn.type = "button";
    btn.disabled = !song.notes;

    const num = document.createElement("span");
    num.className = "song-item__num";
    num.textContent = String(i + 1);

    const text = document.createElement("span");
    text.className = "song-item__text";
    const title = document.createElement("span");
    title.className = "song-item__title";
    title.textContent = song.title;
    const sub = document.createElement("span");
    sub.className = "song-item__sub";
    sub.textContent = song.notes ? song.subtitle : "Coming soon";
    text.append(title, sub);

    btn.append(num, text);
    if (song.notes) btn.addEventListener("click", () => {
      closeSongsModal();
      playSong(song);
    });
    li.appendChild(btn);
    songList.appendChild(li);
  });
}

function openSongsModal() {
  songsModal.hidden = false;
}

function closeSongsModal() {
  songsModal.hidden = true;
}

function playSong(song) {
  stopAutoplay();
  audio.resume(); // unlock the AudioContext within this click gesture (needed on mobile)
  fitKeyboardToSong(song);

  let end = 0;
  for (const [midi, start, dur] of song.notes) {
    autoplayTimers.push(setTimeout(() => autoNoteOn(midi), start * 1000));
    autoplayTimers.push(setTimeout(() => autoNoteOff(midi), (start + dur) * 1000));
    end = Math.max(end, start + dur);
  }
  autoplayTimers.push(setTimeout(stopAutoplay, end * 1000 + 400));

  nowPlayingLabel.textContent = "▶ " + song.title;
  nowPlaying.hidden = false;
}

function stopAutoplay() {
  autoplayTimers.forEach(clearTimeout);
  autoplayTimers = [];
  autoplayNotes.forEach(autoNoteOff);
  autoplayNotes.clear();
  restoreKeyboard();
  nowPlaying.hidden = true;
}

// Temporarily retune the visible keyboard to the song's pitch range so the keys
// light up as it plays; stopAutoplay() restores the user's chosen octave layout.
function fitKeyboardToSong(song) {
  const midis = song.notes.map((n) => n[0]);
  const lo = Math.min(...midis);
  const hi = Math.max(...midis);
  const startOctave = Math.min(5, Math.max(2, Math.floor(lo / 12) - 1));
  const startMidi = 12 * (startOctave + 1);
  const octaves = Math.min(4, Math.max(1, Math.ceil((hi - startMidi + 1) / 12)));

  savedKeyboard = { start: startOctaveInput.value, count: octaveCountInput.value };
  startOctaveInput.value = String(startOctave);
  octaveCountInput.value = String(octaves);
  buildKeyboard();
}

function restoreKeyboard() {
  if (!savedKeyboard) return;
  startOctaveInput.value = savedKeyboard.start;
  octaveCountInput.value = savedKeyboard.count;
  savedKeyboard = null;
  buildKeyboard();
}

function autoNoteOn(midi) {
  autoplayNotes.add(midi);
  audio.noteOff(midi); // release any lingering voice so the same pitch retriggers cleanly
  audio.noteOn(midi);
  const el = keyElements.get(midi);
  if (el) el.classList.add("is-active");
}

function autoNoteOff(midi) {
  autoplayNotes.delete(midi);
  audio.noteOff(midi);
  const el = keyElements.get(midi);
  if (el && !isNoteHeldElsewhere(midi, null)) el.classList.remove("is-active");
}

// ---------- Audio engine (Web Audio API) ----------

function createAudioEngine() {
  let ctx = null;
  let master = null;
  let pianoWave = null;
  let volume = 0.7;
  const voices = new Map(); // midi -> { oscillators, gain }

  function ensureContext() {
    if (ctx) {
      if (ctx.state === "suspended") ctx.resume();
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    ctx = new AudioCtx();
    pianoWave = buildPianoWave();

    master = ctx.createGain();
    master.gain.value = volume;
    // Compressor tames peaks so chords don't clip into harshness.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;
    master.connect(comp);
    comp.connect(ctx.destination);
  }

  // A struck-string harmonic spectrum: strong fundamental with quickly
  // decreasing overtones — much closer to a piano than a bare triangle.
  function buildPianoWave() {
    const real = new Float32Array([0, 1, 0.62, 0.43, 0.30, 0.22, 0.16, 0.12, 0.09, 0.07, 0.05, 0.04, 0.03, 0.02]);
    const imag = new Float32Array(real.length);
    return ctx.createPeriodicWave(real, imag);
  }

  function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function noteOn(midi) {
    ensureContext();
    if (voices.has(midi)) return;

    const now = ctx.currentTime;
    const freq = midiToFreq(midi);

    // Two unison oscillators detuned a few cents — real piano strings beat
    // slightly against each other, which warms up the tone.
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.setPeriodicWave(pianoWave);
    osc2.setPeriodicWave(pianoWave);
    osc1.frequency.value = freq;
    osc2.frequency.value = freq;
    osc1.detune.value = -5;
    osc2.detune.value = 5;

    // Hammer brightness that fades: open the low-pass, then close it.
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 0.4;
    filter.frequency.setValueAtTime(Math.min(freq * 6 + 2000, 12000), now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(freq * 2.5, 700), now + 0.6);

    // Percussive envelope: near-instant attack, then a continuous decay so a
    // held note rings and fades instead of sustaining flat like an organ/chip.
    const gain = ctx.createGain();
    const peak = 0.34;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(peak * 0.28, now + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 8);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc1.start(now);
    osc2.start(now);

    voices.set(midi, { oscillators: [osc1, osc2], gain });
  }

  function noteOff(midi) {
    const voice = voices.get(midi);
    if (!voice || !ctx) return;
    voices.delete(midi);

    const now = ctx.currentTime;
    // Smooth release from the current level (setTargetAtTime needs no read-back).
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setTargetAtTime(0.0001, now, 0.12);
    for (const osc of voice.oscillators) osc.stop(now + 0.6);
  }

  function setVolume(value) {
    volume = value;
    if (master) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.01);
  }

  return { noteOn, noteOff, setVolume, resume: ensureContext };
}
