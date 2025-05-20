import { setupRecorder } from './recorder.js';
import { setupTranscriber } from './transcriber.js';
import { setupSummarizer } from './summarizer.js';
import { loadAPIKey, saveAPIKey } from './utils.js';

// DOM elements
const keyInput = document.getElementById('keyInput');
const setKeyButton = document.getElementById('setKeyButton');

// Load saved API key on startup
window.addEventListener('DOMContentLoaded', () => {
  const savedKey = loadAPIKey();
  if (savedKey) keyInput.value = savedKey;
});

// Save API key when set
setKeyButton.addEventListener('click', () => {
  saveAPIKey(keyInput.value);
});

// Setup feature modules
setupRecorder();
setupTranscriber();
setupSummarizer();