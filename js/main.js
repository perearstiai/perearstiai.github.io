import { setupRecorder } from './recorder.js';
import { setupTranscriber } from './transcriber.js';
import { setupSummarizer } from './summarizer.js';
import { loadAPIKey, saveAPIKey } from './utils.js';

// DOM elements
const keyInput = document.getElementById('keyInput');
const setKeyButton = document.getElementById('setKeyButton');

// TODO - Add a visibility toggle for the API key input
// TODO - Add a possiblity to clear the selected file (for both file inputs)
// TODO - Add a settings button to header to open a modal with settings
// TODO - Make the UI cleaner (adjust margins, paddings, buttons etc.)

// Load saved API key on startup
window.addEventListener('DOMContentLoaded', () => {
  const savedKey = loadAPIKey();
  if (savedKey) keyInput.value = savedKey;

  // Recorder should be restarted on each page load (including refresh)
  setupRecorder();
});

// Save API key when set
setKeyButton.addEventListener('click', () => {
  saveAPIKey(keyInput.value);
});

// Setup feature modules
setupTranscriber();
setupSummarizer();