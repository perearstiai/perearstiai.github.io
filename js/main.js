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

    // --- Universal Expand Button Logic ---
    function setupUniversalExpandButtons() {
      document.querySelectorAll('textarea').forEach((textarea, idx) => {
        // Find the wrapper (prefer .copy-textarea-wrapper if present)
        let wrapper = textarea.closest('.copy-textarea-wrapper') || textarea.closest('.textarea-expand-wrapper');
        if (!wrapper) {
          wrapper = document.createElement('div');
          wrapper.className = 'textarea-expand-wrapper';
          textarea.parentNode.insertBefore(wrapper, textarea);
          wrapper.appendChild(textarea);
        }
        // Avoid double expand button
        if (!wrapper.querySelector('.expand-arrow-btn')) {
          addExpandBtn(textarea, idx, wrapper);
        }
      });
    }

    function addExpandBtn(textarea, idx, wrapper) {
      const btnId = `expandBtn_${idx}`;
      const tooltipId = `expandTooltip_${idx}`;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'expand-arrow-btn';
      btn.id = btnId;
      btn.setAttribute('aria-label', getLocaleText('expand') || 'Expand');
      btn.style.display = 'none';

      const arrow = document.createElement('span');
      arrow.className = 'expand-arrow';
      arrow.innerHTML = '&#x25BC;';

      const tooltip = document.createElement('span');
      tooltip.className = 'expand-tooltip';
      tooltip.id = tooltipId;
      tooltip.setAttribute('data-i18n', 'expand');
      tooltip.textContent = getLocaleText('expand') || 'Expand';

      btn.appendChild(arrow);
      btn.appendChild(tooltip);
      wrapper.appendChild(btn);

      let expanded = false;

      function updateUI() {
        if (expanded) {
          btn.classList.add('expanded');
          textarea.classList.add('expanded-textarea');
          arrow.style.transform = 'rotate(180deg)';
          tooltip.textContent = getLocaleText('collapse');
          btn.setAttribute('aria-label', getLocaleText('collapse'));
          textarea.style.resize = 'none';
          // Set height to scrollHeight
          textarea.style.height = textarea.scrollHeight + 2 + 'px';
          textarea.style.maxHeight = window.innerHeight * 1.8 + 'px';
        } else {
          btn.classList.remove('expanded');
          textarea.classList.remove('expanded-textarea');
          arrow.style.transform = '';
          tooltip.textContent = getLocaleText('expand');
          btn.setAttribute('aria-label', getLocaleText('expand'));
          textarea.style.resize = 'vertical';
          textarea.style.height = '';
          textarea.style.maxHeight = '';
        }
      }

      function checkExpandNeeded() {
        textarea.style.height = '';
        if (textarea.scrollHeight > textarea.clientHeight + 2) {
          btn.style.display = '';
        } else {
          btn.style.display = 'none';
          if (expanded) {
            expanded = false;
            updateUI();
          }
        }
      }

      btn.addEventListener('click', () => {
        expanded = !expanded;
        updateUI();
      });

      // Tooltip i18n update
      onTranslationsUpdated(() => {
        updateUI();
      });

      btn.addEventListener('mouseenter', () => {
        tooltip.textContent = expanded ? getLocaleText('collapse') : getLocaleText('expand');
        tooltip.style.opacity = 1;
      });
      btn.addEventListener('focus', () => {
        tooltip.textContent = expanded ? getLocaleText('collapse') : getLocaleText('expand');
        tooltip.style.opacity = 1;
      });
      btn.addEventListener('mouseleave', () => {
        tooltip.style.opacity = 0;
      });
      btn.addEventListener('blur', () => {
        tooltip.style.opacity = 0;
      });

      textarea.addEventListener('input', () => {
        if (expanded) {
          textarea.style.height = 'auto';
          textarea.style.height = textarea.scrollHeight + 2 + 'px';
          textarea.style.maxHeight = window.innerHeight * 1.8 + 'px';
        }
        checkExpandNeeded();
      });

      // Initial check
      checkExpandNeeded();
      window.addEventListener('resize', checkExpandNeeded);

      updateUI();
    }

    setupUniversalExpandButtons();
  });
});