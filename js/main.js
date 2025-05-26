import { setupRecorder } from './recorder.js';
import { setupTranscriber } from './transcriber.js';
import { setupSummarizer } from './summarizer.js';
import { setupSettingsModal, requireSettings, requireLang, loadAndApplyTranslations, saveSettings, getSettings } from './settings.js';
import { setupFooterLinks } from './footer-links.js';

window.addEventListener('DOMContentLoaded', async () => {
  await requireLang();
  setupSettingsModal();
  requireSettings().then(() => {
    setupRecorder();
    setupTranscriber();
    setupSummarizer();
    setupFooterLinks();

    // --- File clear button logic ---
    const recordedFile = document.getElementById('recordedFile');
    const clearRecordedFile = document.getElementById('clearRecordedFile');
    const timer = document.getElementById('timer');

    function updateClearRecordedFileBtn() {
      clearRecordedFile.style.display = recordedFile.files.length > 0 ? '' : 'none';
    }
    recordedFile.addEventListener('change', updateClearRecordedFileBtn);
    clearRecordedFile.addEventListener('click', () => {
      recordedFile.value = '';
      timer.textContent = '00:00.00';
      recordedFile.dispatchEvent(new Event('change', { bubbles: true }));
    });
    updateClearRecordedFileBtn();

    // --- Custom Dropdown Logic ---
    const dropdown = document.getElementById('customLangDropdown');
    const selected = document.getElementById('customLangSelected');
    const options = document.getElementById('customLangOptions');
    const hiddenInput = document.getElementById('settingsLang');

    // Toggle dropdown open/close
    dropdown.addEventListener('mousedown', (e) => {
      if (!e.target.classList.contains('custom-dropdown-option')) {
        dropdown.classList.toggle('open');
      }
    });

    // Option selection
    options.addEventListener('mousedown', async (e) => {
      const option = e.target.closest('.custom-dropdown-option');
      if (option && options.contains(option)) {
        options.querySelectorAll('.custom-dropdown-option').forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        selected.textContent = option.textContent;
        const langValue = option.getAttribute('data-value');
        hiddenInput.value = langValue;
        dropdown.classList.remove('open');
        // Save language to settings and apply translations
        saveSettings({ ...getSettings(), lang: langValue });
        await loadAndApplyTranslations(langValue);
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener('mousedown', (e) => {
      if (dropdown.classList.contains('open') && !dropdown.contains(e.target)) {
        dropdown.classList.remove('open');
      }
    });

    // Keyboard accessibility
    dropdown.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        dropdown.classList.toggle('open');
        e.preventDefault();
      } else if (e.key === 'Escape') {
        dropdown.classList.remove('open');
      }
    });
  });
});