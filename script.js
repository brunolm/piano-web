"use strict";

// Twelve-tone equal temperament, A4 = 440 Hz. MIDI note 69 == A4.
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const WHITE_OFFSETS = new Set([0, 2, 4, 5, 7, 9, 11]); // semitone offsets that are white keys

// Computer-keyboard row mapped to consecutive semitones, starting at the piano's first note.
const KEY_ROW = ["a", "w", "s", "e", "d", "f", "t", "g", "y", "h", "u", "j", "k", "o", "l", "p", ";", "'"];

// Auto-play songs. `notes` is an absolute-time list of [midi, startSeconds, durationSeconds]
// triples (played back through the live audio engine). Entries without `notes` render as
// locked placeholders. ReawakeR is the lead/solo line transcribed from the community "MEDIUM"
// sequence at onlinesequencer.net/4589659 (Solo Leveling S2 opening, B minor).
const REAWAKER_SOLO = [
  [90,0.3,1.41],[86,1.5,0.93],[86,2.7,0.48],[83,3.19,0.93],[83,4.39,0.45],[88,5.59,1.41],
  [88,6.79,0.45],[95,7.5,0.22],[95,7.72,0.22],[93,7.85,0.35],[95,7.95,0.22],[95,8.17,0.96],
  [93,8.52,0.61],[90,8.87,0.26],[95,9.36,0.22],[95,9.58,0.22],[95,9.8,0.26],[93,9.93,0.13],
  [95,10.06,0.93],[93,10.41,0.58],[90,10.76,0.23],[90,11.21,0.35],[90,11.56,0.13],[90,11.69,0.23],
  [90,11.92,0.22],[90,12.14,0.22],[90,12.36,0.35],[88,12.62,0.22],[90,12.72,0.13],[90,13.07,0.35],
  [90,13.42,0.13],[90,13.55,0.22],[90,13.77,0.22],[90,13.99,0.22],[90,14.22,0.35],[88,14.47,0.23],
  [90,14.57,0.13],[86,14.7,1.89],[90,14.92,1.63],[95,15.18,0.45],[95,15.63,0.71],[93,16.11,0.48],
  [95,16.33,0.26],[88,16.56,1.86],[93,16.78,0.26],[93,17.04,0.93],[90,17.26,1.15],[95,17.48,0.71],
  [93,17.96,0.45],[95,18.19,0.22],[90,18.41,1.63],[95,18.67,0.45],[94,18.89,0.93],[95,19.11,0.48],
  [95,19.59,0.9],[94,19.82,0.67],[90,20.04,0.45],[86,21.24,0.22],[86,22.17,0.35],[90,23.1,0.26],
  [90,24.03,0.35],[90,24.38,0.13],[88,24.96,0.26],[88,25.91,0.32],[88,26.23,0.13],[83,26.81,0.26],
  [83,27.77,0.35],[86,28.22,0.48],[86,28.7,0.22],[86,29.63,0.35],[90,30.56,0.22],[90,31.48,0.35],
  [88,32.41,0.26],[88,33.34,0.35],[88,33.69,0.13],[88,34.27,0.35],[88,34.62,0.13],[88,34.75,0.67],
  [83,35.2,0.48],[88,35.42,0.26],[86,35.68,0.45],[90,36.12,0.13],[90,36.25,0.13],[90,36.48,0.13],
  [90,36.6,0.23],[90,36.83,0.48],[86,37.05,0.35],[90,37.4,0.13],[90,37.53,0.23],[90,37.76,0.22],
  [90,37.98,0.26],[90,38.91,0.35],[90,39.26,0.13],[88,39.87,0.22],[93,40.19,0.13],[93,40.32,0.93],
  [90,40.54,0.7],[88,40.8,0.35],[95,41.02,0.13],[95,41.24,0.22],[95,41.47,0.48],[83,41.72,0.22],
  [83,42.65,0.35],[86,43.1,0.48],[86,43.58,0.22],[90,43.68,0.13],[90,44.03,0.26],[90,44.28,0.45],
  [86,44.51,0.35],[90,44.73,0.13],[90,44.96,0.26],[90,45.21,0.22],[90,45.43,0.23],[90,46.36,0.35],
  [88,47.29,0.23],[93,47.64,0.13],[93,47.77,0.93],[90,48,0.7],[88,48.22,0.35],[95,48.44,0.13],
  [95,48.57,0.13],[95,48.7,0.22],[95,48.92,0.48],[88,49.15,0.26],[88,49.5,0.13],[88,49.63,0.7],
  [83,50.08,0.48],[88,50.33,0.23],[86,50.56,0.93],[86,51.48,0.7],[86,52.19,0.22],[90,53.34,0.7],
  [90,54.04,0.22],[88,54.27,0.71],[88,54.97,0.22],[88,55.2,0.7],[88,55.9,0.22],[83,57.05,0.7],
  [83,57.76,0.22],[86,57.98,0.96],[86,58.94,0.67],[86,59.61,0.22],[90,60.8,0.67],[90,61.47,0.22],
  [88,61.72,0.93],[88,62.65,0.7],[88,63.36,0.22],[88,64.51,0.7],[88,65.21,0.22],[86,65.79,0.13],
  [90,66.23,0.13],[90,66.36,0.22],[90,66.59,0.48],[90,67.07,0.22],[86,67.16,0.13],[90,68.12,0.8],
  [90,68.92,0.13],[88,69.5,0.13],[93,69.85,0.13],[88,69.98,0.93],[93,70.08,0.93],[90,70.33,0.7],
  [95,70.78,0.26],[83,70.91,0.13],[93,71.26,0.26],[83,71.36,0.13],[93,71.71,0.13],[93,71.83,1.02],
  [92,71.96,0.9],[90,72.19,0.67],[83,72.63,0.23],
];

const SONGS = [
  { title: "Solo Leveling — ReawakeR", subtitle: "LiSA feat. Felix · lead line", notes: REAWAKER_SOLO },
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
