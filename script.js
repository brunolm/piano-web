"use strict";

// Twelve-tone equal temperament, A4 = 440 Hz. MIDI note 69 == A4.
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const WHITE_OFFSETS = new Set([0, 2, 4, 5, 7, 9, 11]); // semitone offsets that are white keys

// White keys are played by the two lower letter rows (A–' then Z–/); black keys by the
// number row (`–=) then the QWERTY row (Q–\). Each list maps in order to the white / black
// keys of the current keyboard, left to right.
const WHITE_KEYS = ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/"];
const BLACK_KEYS = ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"];

// Auto-play songs. `notes` is an absolute-time list of [midi, startSeconds, durationSeconds]
// triples. Entries without `notes` render as locked placeholders. ReawakeR is the intro solo
// riff (the opening instrumental hook) transcribed from the official MuseScore score, 129 BPM.
const REAWAKER_NOTES = [
  [66,0.3,0.23],[78,0.53,0.23],[78,0.77,0.12],[78,0.88,0.12],[78,1,0.47],[76,1.46,0.23],[76,1.7,0.23],[76,1.93,0.23],
  [76,2.16,0.23],[70,2.39,0.23],[70,2.63,0.23],[71,2.86,0.23],[73,3.09,0.47],[74,3.56,0.23],[73,3.79,0.23],[66,4.02,0.23],
  [78,4.25,0.23],[78,4.49,0.12],[78,4.6,0.12],[78,4.72,0.47],[76,5.18,0.23],[76,5.42,0.23],[76,5.65,0.23],[76,5.88,0.23],
  [70,6.11,0.23],[70,6.35,0.23],[71,6.58,0.23],[73,6.81,0.47],[73,7.28,0.23],[76,7.51,0.23],[78,7.74,0.7],[78,8.44,0.47],
  [81,8.9,0.23],[80,9.14,0.23],[80,9.37,0.23],[80,9.6,0.23],[76,9.83,0.47],[76,10.3,0.47],[73,10.77,0.47],[76,11.23,0.23],
  [78,11.46,0.7],[78,12.16,0.47],[81,12.63,0.23],[80,12.86,0.23],[80,13.09,0.23],[80,13.32,0.23],[76,13.56,0.47],[76,14.02,0.7],
  [73,14.72,0.23],[71,14.95,0.23],
];

const SONGS = [
  { title: "Solo Leveling — ReawakeR", subtitle: "LiSA feat. Felix · intro solo", notes: REAWAKER_NOTES },
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
const pianoScroll = piano.closest(".piano-scroll");
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
const helpModal = document.getElementById("helpModal");
const keyGuide = document.getElementById("keyGuide");
const keyGuideStrip = document.getElementById("keyGuideStrip");
const keyGuideTitle = document.getElementById("keyGuideTitle");
const keyGuideClose = document.getElementById("keyGuideClose");

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
wireHelp();
showVersion();

// ---------- Keyboard construction ----------

function buildKeyboard() {
  const startMidi = 12 * (Number(startOctaveInput.value) + 1); // C of the chosen octave
  const octaves = Number(octaveCountInput.value);
  const totalSemitones = octaves * 12 + 1; // include the trailing C to close the last octave

  piano.innerHTML = "";
  piano.classList.remove("show-shortcuts");
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
  const whiteMidis = whiteKeys.map((el) => Number(el.dataset.midi));

  // Black keys overlay between the appropriate white keys.
  const whiteWidthPct = 100 / whiteKeys.length;
  const blackMidis = [];
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
    blackMidis.push(midi);
  }

  assignComputerKeys(whiteMidis, blackMidis);
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

function assignComputerKeys(whiteMidis, blackMidis) {
  WHITE_KEYS.forEach((char, i) => {
    if (whiteMidis[i] !== undefined) codeToMidi.set(char, whiteMidis[i]);
  });
  BLACK_KEYS.forEach((char, i) => {
    if (blackMidis[i] !== undefined) codeToMidi.set(char, blackMidis[i]);
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
  keyGuideClose.addEventListener("click", stopAutoplay);
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
    li.className = "song-row" + (song.notes ? "" : " song-row--locked");

    const num = document.createElement("span");
    num.className = "song-item__num";
    num.textContent = String(i + 1);

    const text = document.createElement("span");
    text.className = "song-item__text";
    const title = document.createElement("span");
    title.className = "song-item__title";
    title.textContent = song.title;
    text.appendChild(title);
    if (song.notes) {
      const sub = document.createElement("span");
      sub.className = "song-item__sub";
      sub.textContent = song.subtitle;
      text.appendChild(sub);
    }
    li.append(num, text);

    if (song.notes) {
      const actions = document.createElement("span");
      actions.className = "song-row__actions";
      actions.append(
        songButton("▶ Play", "song-btn", () => { closeSongsModal(); playSong(song); }),
        songButton("⌨ Show keys", "song-btn song-btn--ghost", () => { closeSongsModal(); showKeys(song); }),
      );
      li.appendChild(actions);
    } else {
      const soon = document.createElement("span");
      soon.className = "song-row__soon";
      soon.textContent = "Coming soon";
      li.appendChild(soon);
    }
    songList.appendChild(li);
  });
}

function songButton(label, className, onClick) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = className;
  btn.textContent = label;
  btn.addEventListener("click", onClick);
  return btn;
}

function openSongsModal() {
  songsModal.hidden = false;
}

function closeSongsModal() {
  songsModal.hidden = true;
}

// ---------- Help (keyboard shortcuts) ----------

function wireHelp() {
  helpModal.addEventListener("click", (e) => {
    if (e.target.hasAttribute("data-close")) helpModal.hidden = true;
  });
  window.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "?") {
      e.preventDefault();
      toggleHelp();
    } else if (e.key === "Escape") {
      if (!helpModal.hidden) helpModal.hidden = true;
      else if (!keyGuide.hidden) stopAutoplay();
    }
  });
}

function toggleHelp() {
  if (helpModal.hidden) {
    closeSongsModal();
    helpModal.hidden = false;
  } else {
    helpModal.hidden = true;
  }
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
  keyGuide.hidden = true;
}

// "Show keys": instead of playing, retune the keyboard to the song and lay out the
// sequence of computer keys to press (and label the on-screen keys) so it can be played by hand.
function showKeys(song) {
  stopAutoplay();
  fitKeyboardToSong(song);

  const keyForMidi = invertKeyMap();
  keyElements.forEach((el, midi) => {
    const k = keyForMidi.get(midi);
    if (!k) return;
    const tag = document.createElement("span");
    tag.className = "key__shortcut";
    tag.textContent = k.toUpperCase();
    el.appendChild(tag);
  });
  piano.classList.add("show-shortcuts");

  keyGuideStrip.innerHTML = "";
  for (const [midi] of song.notes) {
    const k = keyForMidi.get(midi);
    const chip = document.createElement("kbd");
    chip.className = "key-chip" + (k ? "" : " key-chip--none");
    chip.textContent = k ? k.toUpperCase() : "·";
    keyGuideStrip.appendChild(chip);
  }
  keyGuideTitle.textContent = "Keys to play — " + song.title;
  keyGuide.hidden = false;
  keyGuideStrip.scrollLeft = 0;
}

// midi -> the first computer key that triggers it, for the current keyboard layout.
function invertKeyMap() {
  const map = new Map();
  for (const [key, midi] of codeToMidi) {
    if (!map.has(midi)) map.set(midi, key);
  }
  return map;
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
  if (el) {
    el.classList.add("is-active");
    keepKeyVisible(el);
  }
}

// During auto-play / show-keys, scroll the keyboard so the active key stays on screen.
function keepKeyVisible(el) {
  if (!pianoScroll) return;
  const left = el.offsetLeft;
  const right = left + el.offsetWidth;
  if (left < pianoScroll.scrollLeft || right > pianoScroll.scrollLeft + pianoScroll.clientWidth) {
    pianoScroll.scrollTo({ left: left - pianoScroll.clientWidth / 2 + el.offsetWidth / 2, behavior: "smooth" });
  }
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
