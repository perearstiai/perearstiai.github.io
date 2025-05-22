import { setupRecorder } from './recorder.js';
import { setupTranscriber } from './transcriber.js';
import { setupSummarizer } from './summarizer.js';
import { setupSettingsModal, requireSettings } from './settings.js';
import { setupFooterLinks } from './footer-links.js';


window.addEventListener('DOMContentLoaded', () => {
  setupSettingsModal();
  requireSettings().then(() => {
    setupRecorder();
    setupTranscriber();
    setupSummarizer();
    setupFooterLinks();

    // --- File clear button logic ---
    // Recorded file
    const recordedFile = document.getElementById('recordedFile');
    const clearRecordedFile = document.getElementById('clearRecordedFile');
    function updateClearRecordedFileBtn() {
      clearRecordedFile.style.display = recordedFile.files.length > 0 ? '' : 'none';
    }
    recordedFile.addEventListener('change', updateClearRecordedFileBtn);
    clearRecordedFile.addEventListener('click', () => {
      recordedFile.value = '';
      recordedFile.dispatchEvent(new Event('change', { bubbles: true }));
    });
    updateClearRecordedFileBtn();

    // Transcribed file
    const transcribedFile = document.getElementById('transcribedFile');
    const clearTranscribedFile = document.getElementById('clearTranscribedFile');
    function updateClearTranscribedFileBtn() {
      clearTranscribedFile.style.display = transcribedFile.files.length > 0 ? '' : 'none';
    }
    transcribedFile.addEventListener('change', updateClearTranscribedFileBtn);
    clearTranscribedFile.addEventListener('click', () => {
      transcribedFile.value = '';
      transcribedFile.dispatchEvent(new Event('change', { bubbles: true }));
    });
    updateClearTranscribedFileBtn();
  });
});