"use strict";

// Twelve-tone equal temperament, A4 = 440 Hz. MIDI note 69 == A4.
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const WHITE_OFFSETS = new Set([0, 2, 4, 5, 7, 9, 11]); // semitone offsets that are white keys

// Computer-keyboard row mapped to consecutive semitones, starting at the piano's first note.
const KEY_ROW = ["a", "w", "s", "e", "d", "f", "t", "g", "y", "h", "u", "j", "k", "o", "l", "p", ";", "'"];

// Auto-play songs. `notes` is an absolute-time list of [midi, startSeconds, durationSeconds]
// triples played polyphonically through the live engine. Entries without `notes` render as
// locked placeholders. ReawakeR is the full original transcription (every note, original
// pitch) of onlinesequencer.net/4589659 - Solo Leveling S2 opening, B minor.
const REAWAKER_NOTES = [
  [66,0.3,0.35],[78,0.3,1.41],[90,0.3,5.12],[97,0.3,0.93],[102,0.3,11.17],[66,0.65,0.35],
  [66,1,0.22],[66,1.23,0.13],[97,1.23,5.6],[66,1.36,0.22],[66,1.58,0.35],[78,1.71,0.22],
  [66,1.93,0.22],[78,1.93,0.26],[66,2.16,0.35],[66,2.51,0.35],[66,2.86,0.22],[66,3.08,0.13],
  [66,3.21,0.23],[66,3.44,0.13],[66,3.56,0.22],[78,3.56,0.48],[66,3.79,0.22],[66,4.01,0.35],
  [78,4.04,0.9],[114,4.27,0.23],[66,4.37,0.35],[114,4.49,0.13],[66,4.72,0.22],[114,4.72,1.18],
  [66,4.94,0.13],[66,5.07,0.22],[112,5.2,0.22],[66,5.29,0.13],[66,5.42,0.22],[78,5.42,0.26],
  [90,5.42,1.41],[112,5.42,0.22],[66,5.64,0.22],[112,5.64,1.19],[78,5.68,0.22],[66,5.87,0.35],
  [78,5.9,0.9],[106,6.13,0.22],[66,6.22,0.35],[106,6.35,0.45],[66,6.57,0.22],[107,6.57,0.22],
  [66,6.8,0.13],[109,6.83,0.67],[66,6.92,0.23],[66,7.15,0.13],[66,7.28,0.22],[78,7.28,0.26],
  [110,7.28,0.48],[66,7.5,0.26],[109,7.5,0.29],[78,7.53,0.22],[66,7.76,0.32],[78,7.76,0.93],
  [114,7.98,0.22],[66,8.08,0.35],[114,8.21,0.13],[66,8.43,0.26],[114,8.43,1.18],[66,8.78,0.22],
  [112,8.91,0.22],[66,9,0.13],[66,9.13,0.22],[78,9.13,0.26],[112,9.13,0.22],[66,9.36,0.26],
  [112,9.36,1.18],[78,9.39,0.22],[66,9.61,0.32],[78,9.61,0.93],[106,9.84,0.23],[66,9.93,0.35],
  [106,10.06,0.48],[66,10.29,0.26],[107,10.32,0.22],[109,10.54,0.45],[66,10.64,0.26],[66,10.89,0.13],
  [109,10.99,0.48],[66,11.02,0.19],[78,11.02,0.22],[66,11.21,0.23],[78,11.24,0.23],[112,11.24,0.23],
  [86,11.47,0.93],[105,11.47,0.93],[114,11.47,0.7],[74,11.82,0.35],[74,12.17,0.22],[114,12.17,1.15],
  [74,12.4,0.13],[74,12.52,0.23],[117,12.62,0.71],[74,12.75,0.35],[86,12.84,0.48],[116,12.84,0.26],
  [74,13.1,0.23],[116,13.1,0.23],[83,13.33,0.93],[112,13.55,0.48],[71,13.68,0.35],[71,14.03,0.22],
  [112,14.03,0.93],[109,14.48,0.48],[71,14.61,0.35],[83,14.73,0.45],[71,14.96,0.22],[112,14.96,0.22],
  [69,15.18,0.35],[81,15.18,0.39],[105,15.18,13.06],[114,15.18,0.71],[69,15.53,0.35],[81,15.57,0.32],
  [69,15.89,0.22],[81,15.89,0.26],[114,15.89,3.04],[69,16.11,0.13],[69,16.24,0.22],[81,16.24,0.22],
  [117,16.36,0.7],[69,16.46,0.35],[81,16.46,0.13],[81,16.59,0.22],[116,16.59,0.22],[69,16.81,0.22],
  [81,16.81,0.26],[116,16.81,2.11],[76,17.04,0.35],[88,17.04,1.41],[112,17.29,0.45],[76,17.39,0.35],
  [76,17.74,0.23],[112,17.74,1.19],[76,17.97,0.13],[76,18.09,0.22],[76,18.32,0.35],[88,18.44,0.45],
  [109,18.44,0.45],[76,18.67,0.22],[107,18.67,0.22],[66,18.93,0.32],[95,19.15,0.22],[66,19.24,0.26],
  [95,19.37,0.22],[66,19.5,0.35],[93,19.5,0.35],[95,19.6,0.22],[78,19.63,0.26],[95,19.82,0.96],
  [66,19.85,0.93],[93,20.17,0.61],[78,20.3,0.48],[90,20.52,0.26],[66,20.78,0.35],[95,21.01,0.22],
  [66,21.13,0.22],[95,21.23,0.22],[66,21.36,0.35],[95,21.45,0.26],[78,21.49,0.29],[93,21.58,0.13],
  [66,21.71,0.93],[95,21.71,0.93],[93,22.06,0.58],[78,22.16,0.48],[90,22.41,0.23],[66,22.64,0.35],
  [90,22.86,0.35],[66,22.99,0.22],[66,23.21,0.13],[90,23.21,0.13],[66,23.34,0.23],[78,23.34,0.23],
  [90,23.34,0.23],[66,23.57,0.48],[78,23.57,0.48],[90,23.57,0.22],[90,23.79,0.22],[90,24.01,0.35],
  [66,24.04,0.45],[78,24.04,0.45],[88,24.27,0.22],[90,24.37,0.13],[66,24.49,0.35],[90,24.72,0.35],
  [66,24.84,0.22],[66,25.07,0.13],[90,25.07,0.13],[66,25.2,0.22],[78,25.2,0.22],[90,25.2,0.22],
  [66,25.42,0.48],[78,25.42,0.48],[90,25.42,0.22],[90,25.64,0.22],[90,25.87,0.35],[66,25.9,0.45],
  [78,25.9,0.45],[88,26.12,0.23],[90,26.22,0.13],[74,26.35,1.89],[81,26.35,1.89],[86,26.35,1.89],
  [90,26.57,1.63],[95,26.83,0.45],[95,27.28,0.71],[93,27.76,0.48],[95,27.98,0.26],[76,28.21,1.86],
  [88,28.21,1.86],[83,28.24,1.82],[93,28.43,0.26],[93,28.69,0.93],[90,28.91,1.15],[95,29.13,0.71],
  [93,29.61,0.45],[95,29.84,0.22],[78,30.06,2.08],[90,30.06,1.63],[85,30.09,2.05],[95,30.32,0.45],
  [94,30.54,0.93],[95,30.76,0.48],[95,31.24,0.9],[94,31.47,0.67],[90,31.69,0.45],[66,31.95,0.19],
  [117,32.62,0.13],[117,32.84,0.39],[121,33.55,0.22],[114,33.77,0.7],[119,33.81,0.67],[74,34.16,0.32],
  [81,34.25,0.26],[86,34.25,0.22],[74,34.48,0.48],[114,34.48,0.48],[119,34.48,0.48],[74,34.96,0.48],
  [114,34.96,0.45],[119,34.96,0.67],[81,35.18,0.45],[86,35.18,0.35],[114,35.41,0.96],[74,35.44,0.19],
  [117,35.44,0.9],[78,35.66,0.35],[78,36.01,0.35],[85,36.11,0.26],[90,36.11,0.26],[117,36.33,0.26],
  [78,36.36,0.45],[117,36.59,0.9],[78,36.81,0.48],[119,36.94,0.55],[85,37.04,0.35],[90,37.04,0.35],
  [78,37.29,0.19],[121,37.29,0.26],[85,37.39,0.13],[90,37.39,0.13],[76,37.52,0.35],[112,37.52,0.7],
  [119,37.52,0.45],[76,37.87,0.35],[88,37.97,0.26],[119,37.97,0.26],[83,38,0.22],[76,38.22,0.45],
  [112,38.22,0.45],[119,38.22,0.45],[76,38.67,0.26],[112,38.67,2.59],[119,38.67,0.7],[114,38.89,0.48],
  [76,38.92,0.22],[83,38.92,0.32],[88,38.92,0.32],[76,39.15,0.22],[124,39.15,0.93],[83,39.24,0.13],
  [88,39.24,0.13],[71,39.37,0.35],[71,39.72,0.35],[83,39.82,0.26],[78,39.85,0.22],[71,40.08,0.48],
  [117,40.17,0.13],[117,40.3,0.93],[71,40.56,0.45],[114,40.65,0.58],[78,40.78,0.45],[83,40.78,0.35],
  [71,41.01,0.22],[121,41.01,0.22],[74,41.23,0.35],[86,41.23,0.48],[114,41.23,0.7],[119,41.23,0.7],
  [74,41.58,0.35],[81,41.71,0.22],[86,41.71,0.22],[74,41.93,0.48],[114,41.93,0.45],[119,41.93,0.45],
  [114,42.38,0.26],[119,42.38,0.26],[74,42.41,0.45],[81,42.64,0.45],[86,42.64,0.35],[114,42.64,0.22],
  [119,42.64,0.22],[74,42.86,0.22],[114,42.86,0.96],[119,42.86,0.22],[78,43.08,0.35],[78,43.44,0.35],
  [85,43.57,0.22],[90,43.57,0.22],[78,43.79,0.48],[117,43.79,0.22],[117,44.01,0.93],[78,44.27,0.45],
  [119,44.36,0.57],[85,44.49,0.35],[90,44.49,0.35],[78,44.72,0.22],[121,44.72,0.26],[112,44.94,0.7],
  [119,44.94,0.7],[76,44.97,0.32],[76,45.29,0.35],[83,45.42,0.26],[88,45.42,0.26],[114,45.42,0.26],
  [76,45.64,0.48],[112,45.64,0.93],[119,45.64,0.93],[76,46.12,0.23],[76,46.35,0.22],[83,46.35,0.35],
  [88,46.35,0.35],[114,46.35,0.48],[76,46.57,0.22],[112,46.57,13.02],[119,46.57,1.18],[88,46.7,0.13],
  [76,46.83,0.32],[76,47.15,0.38],[83,47.28,0.35],[88,47.28,0.35],[114,47.5,0.26],[76,47.53,0.22],
  [83,47.63,0.13],[88,47.63,0.13],[76,47.76,0.93],[83,47.76,0.45],[88,47.76,0.67],[119,47.76,0.23],
  [124,47.76,0.23],[119,47.98,0.45],[124,47.98,0.48],[83,48.21,0.48],[88,48.43,0.26],[119,48.43,2.82],
  [124,48.46,0.93],[74,48.69,0.35],[86,48.69,0.45],[114,48.91,0.48],[121,48.91,0.48],[74,49.04,0.35],
  [86,49.13,0.26],[90,49.13,0.13],[81,49.17,0.22],[90,49.26,0.13],[74,49.39,0.45],[90,49.49,0.13],
  [90,49.61,0.23],[74,49.84,0.48],[90,49.84,0.48],[81,50.06,0.48],[86,50.06,0.35],[74,50.32,0.22],
  [86,50.41,0.13],[90,50.41,0.13],[78,50.54,0.35],[90,50.54,0.23],[90,50.77,0.22],[78,50.89,0.35],
  [90,50.99,0.26],[85,51.02,0.22],[78,51.24,0.45],[119,51.24,0.22],[119,51.47,0.93],[78,51.69,0.48],
  [121,51.69,0.7],[90,51.92,0.35],[85,51.95,0.45],[78,52.17,0.22],[114,52.17,0.67],[117,52.17,0.93],
  [90,52.27,0.13],[76,52.4,0.35],[116,52.62,0.48],[76,52.75,0.35],[114,52.84,2.11],[83,52.88,0.22],
  [88,52.88,0.22],[76,53.1,0.45],[93,53.2,0.13],[93,53.33,0.93],[76,53.55,0.48],[90,53.55,0.7],
  [83,53.81,0.35],[88,53.81,0.35],[76,54.03,0.22],[95,54.03,0.13],[71,54.25,0.35],[95,54.25,0.22],
  [95,54.48,0.48],[71,54.61,0.35],[78,54.73,0.22],[83,54.73,0.22],[71,54.96,0.48],[114,54.96,1.18],
  [119,55.18,0.22],[124,55.18,0.26],[119,55.41,0.48],[71,55.44,0.45],[124,55.44,0.45],[78,55.66,0.45],
  [83,55.66,0.35],[71,55.89,0.22],[119,55.89,2.11],[124,55.89,0.93],[74,56.11,0.35],[86,56.11,0.48],
  [114,56.33,0.48],[121,56.36,0.45],[74,56.46,0.35],[81,56.59,0.22],[86,56.59,0.22],[90,56.69,0.13],
  [74,56.81,0.48],[90,57.04,0.26],[74,57.29,0.45],[90,57.29,0.45],[81,57.52,0.45],[86,57.52,0.35],
  [74,57.74,0.26],[90,57.74,0.13],[78,57.97,0.35],[90,57.97,0.26],[90,58.22,0.22],[78,58.32,0.35],
  [85,58.44,0.26],[90,58.44,0.23],[78,58.67,0.48],[117,58.67,0.22],[117,58.89,0.93],[78,59.15,0.45],
  [121,59.15,0.67],[85,59.37,0.35],[90,59.37,0.35],[78,59.6,0.22],[112,59.6,0.7],[119,59.6,0.7],
  [76,59.85,0.35],[117,60.08,0.45],[76,60.21,0.32],[83,60.3,0.23],[88,60.3,0.23],[112,60.3,2.11],
  [119,60.3,0.23],[76,60.53,0.48],[93,60.65,0.13],[93,60.78,0.93],[76,61.01,0.48],[90,61.01,0.7],
  [83,61.23,0.35],[88,61.23,0.35],[95,61.45,0.13],[76,61.49,0.22],[83,61.58,0.13],[88,61.58,0.13],
  [95,61.58,0.13],[76,61.71,0.35],[95,61.71,0.22],[95,61.93,0.48],[76,62.06,0.35],[83,62.16,0.26],
  [88,62.16,0.26],[76,62.41,0.23],[83,62.51,0.13],[88,62.51,0.13],[117,62.51,0.13],[76,62.64,0.93],
  [83,62.64,0.45],[88,62.64,0.7],[117,62.64,0.93],[114,62.99,0.58],[83,63.09,0.48],[88,63.34,0.23],
  [121,63.34,0.23],[74,63.57,0.7],[86,63.57,0.93],[114,63.57,0.7],[119,63.57,0.7],[74,64.27,0.71],
  [114,64.27,0.45],[119,64.27,0.45],[81,64.49,0.7],[86,64.49,0.7],[114,64.72,0.48],[119,64.72,0.7],
  [74,64.97,0.45],[81,65.2,0.22],[86,65.2,0.22],[114,65.2,2.11],[117,65.2,0.93],[78,65.42,0.35],
  [78,65.77,0.35],[78,66.12,0.71],[117,66.12,0.23],[85,66.35,0.7],[90,66.35,0.7],[117,66.35,0.93],
  [119,66.7,0.58],[78,66.83,0.45],[85,67.05,0.22],[90,67.05,0.22],[121,67.05,0.29],[76,67.28,0.71],
  [88,67.28,0.71],[112,67.28,0.48],[119,67.28,0.48],[112,67.76,0.23],[119,67.76,0.23],[76,67.98,0.7],
  [88,67.98,0.22],[112,67.98,0.45],[119,67.98,0.45],[83,68.21,0.7],[88,68.21,0.7],[112,68.43,0.74],
  [119,68.43,0.7],[76,68.69,0.45],[114,68.69,1.73],[83,68.91,0.22],[88,68.91,0.22],[71,69.17,0.32],
  [71,69.49,0.35],[71,69.84,0.26],[117,69.84,0.13],[78,70.06,0.7],[83,70.06,0.7],[117,70.06,0.93],
  [71,70.09,0.45],[114,70.41,0.58],[71,70.54,0.45],[78,70.77,0.22],[83,70.77,0.22],[121,70.77,0.22],
  [86,70.99,0.96],[114,70.99,0.7],[119,70.99,0.7],[74,71.02,0.67],[74,71.69,0.7],[114,71.69,0.48],
  [119,71.69,0.48],[81,71.95,0.67],[86,71.95,0.67],[114,72.17,0.22],[119,72.17,0.22],[74,72.4,0.45],
  [114,72.4,0.22],[119,72.4,0.22],[81,72.62,0.22],[86,72.62,0.22],[114,72.62,2.15],[119,72.62,0.22],
  [78,72.88,0.32],[78,73.2,0.35],[78,73.55,0.7],[117,73.55,0.26],[85,73.81,0.7],[90,73.81,0.67],
  [117,73.81,0.93],[119,74.12,0.58],[78,74.25,0.45],[90,74.48,0.22],[121,74.48,0.29],[85,74.51,0.19],
  [76,74.73,0.7],[88,74.73,0.93],[112,74.73,0.67],[119,74.73,0.67],[114,75.18,0.93],[112,75.41,0.96],
  [119,75.41,0.93],[76,75.44,0.7],[83,75.66,0.7],[88,75.66,0.7],[114,76.11,1.15],[76,76.14,0.45],
  [119,76.33,1.18],[83,76.37,0.22],[88,76.37,0.22],[112,76.37,6.27],[76,76.59,0.35],[76,76.94,0.35],
  [114,77.26,1.41],[76,77.29,0.7],[83,77.52,0.93],[88,77.52,0.7],[119,77.52,0.22],[119,77.74,0.48],
  [124,77.74,0.48],[76,78,0.45],[88,78.22,0.22],[119,78.22,0.7],[124,78.22,0.7],[74,78.44,0.45],
  [114,78.67,1.63],[121,78.67,1.63],[86,78.8,0.13],[74,78.89,0.26],[74,79.15,0.22],[86,79.24,0.93],
  [90,79.24,0.13],[81,79.28,0.93],[74,79.37,0.48],[90,79.37,0.22],[90,79.6,0.48],[74,79.85,0.22],
  [74,80.08,0.22],[90,80.08,0.22],[86,80.17,0.13],[78,80.3,0.23],[78,80.53,0.26],[78,80.78,0.23],
  [78,81.01,0.22],[119,81.01,0.22],[85,81.13,0.8],[90,81.13,0.8],[78,81.23,0.48],[119,81.23,0.93],
  [121,81.45,0.7],[78,81.71,0.22],[78,81.93,0.22],[90,81.93,0.13],[114,81.93,0.71],[117,81.93,0.71],
  [76,82.16,0.26],[116,82.38,0.26],[76,82.41,0.23],[83,82.51,0.13],[88,82.51,0.13],[76,82.64,0.22],
  [114,82.64,3.23],[76,82.86,0.13],[93,82.86,0.13],[83,82.99,0.93],[88,82.99,0.93],[76,83.09,0.48],
  [93,83.09,0.93],[90,83.34,0.7],[76,83.57,0.22],[76,83.79,0.26],[95,83.79,0.26],[83,83.92,0.13],
  [71,84.01,0.26],[71,84.27,0.23],[93,84.27,0.26],[78,84.37,0.13],[83,84.37,0.13],[71,84.72,0.22],
  [93,84.72,0.13],[78,84.84,0.13],[83,84.84,0.13],[93,84.84,1.02],[71,84.94,0.48],[92,84.97,0.9],
  [90,85.2,0.67],[71,85.42,0.35],[83,85.64,0.23],
];

const SONGS = [
  { title: "Solo Leveling — ReawakeR", subtitle: "LiSA feat. Felix · full transcription", notes: REAWAKER_NOTES },
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
