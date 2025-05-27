import { setupRecorder } from './recorder.js';
import { setupTranscriber } from './transcriber.js';
import { setupSummarizer } from './summarizer.js';
import { setupSettingsModal, requireSettings, requireLang, loadAndApplyTranslations, saveSettings, getSettings, getLocaleText, onTranslationsUpdated } from './settings.js';
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

  // --- Copy to clipboard logic ---
  function setupCopyButton({ btnId, iconId, tooltipId, textareaId }) {
    const btn = document.getElementById(btnId);
    const icon = document.getElementById(iconId);
    const tooltip = document.getElementById(tooltipId);
    const textarea = document.getElementById(textareaId);

    const COPY_ICON_SRC = 'assets/img/copy-icon.svg';
    const TICK_ICON_SRC = 'assets/img/copy-success.svg';

    let blurTimeout = null;

    btn.addEventListener('click', async () => {
      if (!textarea) return;
      try {
        await navigator.clipboard.writeText(textarea.value);
        btn.classList.add('copied');
        icon.src = TICK_ICON_SRC;
        tooltip.textContent = getLocaleText('copied');
        // Keep success state visible for 1s, then reset and blur
        clearTimeout(blurTimeout);
        blurTimeout = setTimeout(() => {
          btn.classList.remove('copied');
          icon.src = COPY_ICON_SRC;
          tooltip.textContent = getLocaleText('copy');
          btn.blur();
        }, 1000);
      } catch {
        tooltip.textContent = getLocaleText('copy_error') || 'Copy failed';
      }
    });

    // Only reset if not in copied state
    function resetCopyBtn() {
      if (!btn.classList.contains('copied')) {
        icon.src = COPY_ICON_SRC;
        tooltip.textContent = getLocaleText('copy');
        clearTimeout(blurTimeout);
      }
    }
    btn.addEventListener('mouseleave', resetCopyBtn);
    btn.addEventListener('blur', resetCopyBtn);

    // Update tooltip on hover/focus (for i18n)
    btn.addEventListener('mouseenter', () => {
      if (!btn.classList.contains('copied')) {
        tooltip.textContent = getLocaleText('copy');
      }
    });
    btn.addEventListener('focus', () => {
      if (!btn.classList.contains('copied')) {
        tooltip.textContent = getLocaleText('copy');
      }
    });

    // Update on language change
    onTranslationsUpdated(() => {
      if (btn.classList.contains('copied')) {
        tooltip.textContent = getLocaleText('copied');
      } else {
        tooltip.textContent = getLocaleText('copy');
      }
    });
  }

  setupCopyButton({
    btnId: 'copyTranscriptionBtn',
    iconId: 'copyTranscriptionIcon',
    tooltipId: 'copyTranscriptionTooltip',
    textareaId: 'transcriptionBox'
  });
  setupCopyButton({
    btnId: 'copySummaryBtn',
    iconId: 'copySummaryIcon',
    tooltipId: 'copySummaryTooltip',
    textareaId: 'summaryBox'
  });
});