import { setupRecorder } from './recorder.js';
import { setupTranscriber } from './transcriber.js';
import { setupSummarizer } from './summarizer.js';
import { setupSettingsModal, requireSettings, requireLang } from './settings.js';
import { setupFooterLinks } from './footer-links.js';

// TODO
/*
1. Make language selection dropdown prettier.
2. Add loading spinners to corresponding places when waiting for corresponding API responses.
3. Disable later sections if no input is provided in previous sections.
    Also provide info messages why something is disabled (e.g. on hovering the disabled component).
4. Refactor and clean up code (including HTML and CSS).
5. Add options to settings to select different transcription and summarization models.
6. Make certain page components more responsive.
7. Right now, it is briefly seen when js is gradually applied as dom is loaded, 
    but it would be better to hide the main content until everything is ready (use loading screen with spinner instead).
8. Animate the settings button on hover (e.g., rotate it).
9. Do something about using (text) file of transcription as input for summarization.
*/

window.addEventListener('DOMContentLoaded', async () => {
  await requireLang();
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
    const timer = document.getElementById('timer');
    function updateClearRecordedFileBtn() {
      clearRecordedFile.style.display = recordedFile.files.length > 0 ? '' : 'none';
    }
    recordedFile.addEventListener('change', updateClearRecordedFileBtn);
    clearRecordedFile.addEventListener('click', () => {
      recordedFile.value = '';
      timer.textContent = '00:00.00'; // Reset timer display
      recordedFile.dispatchEvent(new Event('change', { bubbles: true }));
    });
    updateClearRecordedFileBtn();

    // Transcribed file (not used as of now)
    /*
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
    */
  });
});