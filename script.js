"use strict";

// Twelve-tone equal temperament, A4 = 440 Hz. MIDI note 69 == A4.
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const WHITE_OFFSETS = new Set([0, 2, 4, 5, 7, 9, 11]); // semitone offsets that are white keys

// Computer-keyboard row mapped to consecutive semitones, starting at the piano's first note.
const KEY_ROW = ["a", "w", "s", "e", "d", "f", "t", "g", "y", "h", "u", "j", "k", "o", "l", "p", ";", "'"];

const piano = document.getElementById("piano");
const octaveCountInput = document.getElementById("octaveCount");
const startOctaveInput = document.getElementById("startOctave");
const showLabelsInput = document.getElementById("showLabels");
const volumeInput = document.getElementById("volume");

const audio = createAudioEngine();

// Maps a built key element id -> its MIDI number, and the inverse for keyboard input.
let keyElements = new Map();
let codeToMidi = new Map();
const activePointerNotes = new Map(); // pointerId -> midi currently sounding
const heldKeyboardNotes = new Set(); // midi notes held via computer keyboard

buildKeyboard();
wireControls();
wirePointer();
wireComputerKeyboard();

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

// ---------- Audio engine (Web Audio API) ----------

function createAudioEngine() {
  let ctx = null;
  let master = null;
  let volume = 0.7;
  const voices = new Map(); // midi -> { osc, gain }

  function ensureContext() {
    if (ctx) {
      if (ctx.state === "suspended") ctx.resume();
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    ctx = new AudioCtx();
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
  }

  function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function noteOn(midi) {
    ensureContext();
    if (voices.has(midi)) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.value = midiToFreq(midi);

    // Soft attack so taps don't click.
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.9, now + 0.012);

    osc.connect(gain);
    gain.connect(master);
    osc.start(now);

    voices.set(midi, { osc, gain });
  }

  function noteOff(midi) {
    const voice = voices.get(midi);
    if (!voice || !ctx) return;
    voices.delete(midi);

    const now = ctx.currentTime;
    const { osc, gain } = voice;
    // Short release tail to avoid a click on note-off.
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.stop(now + 0.14);
  }

  function setVolume(value) {
    volume = value;
    if (master) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.01);
  }

  return { noteOn, noteOff, setVolume };
}
