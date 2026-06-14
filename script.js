"use strict";

// Twelve-tone equal temperament, A4 = 440 Hz. MIDI note 69 == A4.
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const WHITE_OFFSETS = new Set([0, 2, 4, 5, 7, 9, 11]); // semitone offsets that are white keys

// Computer-keyboard row mapped to consecutive semitones, starting at the piano's first note.
const KEY_ROW = ["a", "w", "s", "e", "d", "f", "t", "g", "y", "h", "u", "j", "k", "o", "l", "p", ";", "'"];

// Auto-play songs. `notes` is a sequence of { n, d } steps played back-to-back:
//   n = note name ("E4"), an array of names for a chord (["E3","B4"]), or null for a rest;
//   d = duration in beats. `tempo` is in BPM. Entries without `notes` render as locked placeholders.
// ReawakeR is a melodic arrangement of the Solo Leveling S2 opening's main theme (E minor, ~130 BPM).
const REAWAKER_NOTES = [
  { n: "E4", d: 0.5 }, { n: "E4", d: 0.5 }, { n: "G4", d: 0.5 }, { n: "B4", d: 0.5 },
  { n: "A4", d: 0.5 }, { n: "G4", d: 0.5 }, { n: "F#4", d: 1 },
  { n: "E4", d: 0.5 }, { n: "E4", d: 0.5 }, { n: "G4", d: 0.5 }, { n: "B4", d: 0.5 },
  { n: "D5", d: 0.5 }, { n: "B4", d: 0.5 }, { n: "A4", d: 1 },
  { n: ["E3", "B4"], d: 0.5 }, { n: "C5", d: 0.5 }, { n: "B4", d: 0.5 }, { n: "A4", d: 0.5 },
  { n: ["G3", "G4"], d: 0.5 }, { n: "A4", d: 0.5 }, { n: "B4", d: 1 },
  { n: ["C4", "C5"], d: 0.5 }, { n: "B4", d: 0.5 }, { n: "A4", d: 0.5 }, { n: "G4", d: 0.5 },
  { n: ["D4", "F#4"], d: 0.5 }, { n: "A4", d: 0.5 }, { n: "G4", d: 1 },
  { n: ["E3", "E4"], d: 0.5 }, { n: "B4", d: 0.5 }, { n: "E5", d: 1 },
  { n: "D5", d: 0.5 }, { n: "B4", d: 0.5 }, { n: "A4", d: 0.5 }, { n: "G4", d: 0.5 },
  { n: "F#4", d: 0.5 }, { n: "E4", d: 0.5 }, { n: "F#4", d: 0.5 }, { n: "G4", d: 0.5 },
  { n: "A4", d: 1 }, { n: null, d: 0.5 }, { n: "B4", d: 0.5 },
  { n: ["E3", "E5"], d: 1 }, { n: ["B3", "D5"], d: 0.5 }, { n: "B4", d: 0.5 },
  { n: ["E3", "E4"], d: 2 },
];

const SONGS = [
  { title: "Solo Leveling — ReawakeR", subtitle: "LiSA feat. Felix · main theme", tempo: 130, notes: REAWAKER_NOTES },
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

buildKeyboard();
wireControls();
wirePointer();
wireComputerKeyboard();
wireSongs();

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

  const beat = 60 / song.tempo;
  let t = 0;
  for (const step of song.notes) {
    const dur = step.d * beat;
    if (step.n) {
      const midis = (Array.isArray(step.n) ? step.n : [step.n]).map(parseNoteName);
      const onMs = t * 1000;
      const offMs = (t + dur * 0.92) * 1000; // small gap so repeated notes retrigger
      for (const midi of midis) {
        autoplayTimers.push(setTimeout(() => autoNoteOn(midi), onMs));
        autoplayTimers.push(setTimeout(() => autoNoteOff(midi), offMs));
      }
    }
    t += dur;
  }
  autoplayTimers.push(setTimeout(stopAutoplay, t * 1000 + 250));

  nowPlayingLabel.textContent = "▶ " + song.title;
  nowPlaying.hidden = false;
}

function stopAutoplay() {
  autoplayTimers.forEach(clearTimeout);
  autoplayTimers = [];
  autoplayNotes.forEach(autoNoteOff);
  autoplayNotes.clear();
  nowPlaying.hidden = true;
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

function parseNoteName(name) {
  const match = /^([A-G]#?)(-?\d)$/.exec(name);
  const semitone = NOTE_NAMES.indexOf(match[1]);
  const octave = Number(match[2]);
  return semitone + (octave + 1) * 12;
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
