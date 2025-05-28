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

      // Sync copy button disabled state with textarea.disabled
      function syncCopyBtnDisabled() {
        btn.disabled = textarea.disabled;
      }
      syncCopyBtnDisabled();
      // Observe disabled attribute
      const observer = new MutationObserver(syncCopyBtnDisabled);
      observer.observe(textarea, { attributes: true, attributeFilter: ['disabled'] });

      btn.addEventListener('click', async () => {
        if (!textarea || btn.disabled) return;
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
        // Only add expand button if not already present
        let wrapper = textarea.closest('.copy-textarea-wrapper') || textarea.closest('.textarea-expand-wrapper');
        if (!wrapper) {
          wrapper = document.createElement('div');
          wrapper.className = 'textarea-expand-wrapper';
          textarea.parentNode.insertBefore(wrapper, textarea);
          wrapper.appendChild(textarea);
        }
        // Remove old expand button if present
        const oldBtn = wrapper.querySelector('.expand-arrow-btn');
        if (oldBtn) oldBtn.remove();
        addExpandBtn(textarea, idx, wrapper);
        // Only trigger input event once to update expand button for default value
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
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

      // Use a property on the textarea to track expanded state
      if (typeof textarea._expanded === 'undefined') textarea._expanded = false;

      function updateUI() {
        if (textarea._expanded) {
          btn.classList.add('expanded');
          textarea.classList.add('expanded-textarea');
          arrow.style.transform = 'rotate(180deg)';
          tooltip.textContent = getLocaleText('collapse');
          btn.setAttribute('aria-label', getLocaleText('collapse'));
          textarea.style.resize = 'none';
          textarea.style.height = textarea.scrollHeight + 2 + 'px';
          textarea.style.maxHeight = window.innerHeight * 1.8 + 'px';
        } else {
          btn.classList.remove('expanded');
          textarea.classList.remove('expanded-textarea');
          arrow.style.transform = '';
          tooltip.textContent = getLocaleText('expand');
          btn.setAttribute('aria-label', getLocaleText('expand'));
          textarea.style.height = '';
          textarea.style.maxHeight = '';
          textarea.style.resize = '';
        }
      }

      function checkExpandNeeded() {
        textarea.style.height = '';
        // Hide expand button if textarea is disabled/loading
        if (textarea.disabled) {
          // If expanded, collapse before hiding
          if (textarea._expanded) {
            textarea._expanded = false;
            updateUI();
          }
          btn.style.display = 'none';
          return;
        }
        if (textarea.scrollHeight > textarea.clientHeight + 2) {
          btn.style.display = '';
        } else {
          btn.style.display = 'none';
        }
      }

      btn.addEventListener('click', () => {
        textarea._expanded = !textarea._expanded;
        updateUI();
      });

      onTranslationsUpdated(() => {
        updateUI();
      });

      btn.addEventListener('mouseenter', () => {
        tooltip.textContent = textarea._expanded ? getLocaleText('collapse') : getLocaleText('expand');
        tooltip.style.opacity = 1;
      });
      btn.addEventListener('focus', () => {
        tooltip.textContent = textarea._expanded ? getLocaleText('collapse') : getLocaleText('expand');
        tooltip.style.opacity = 1;
      });
      btn.addEventListener('mouseleave', () => {
        tooltip.style.opacity = 0;
      });
      btn.addEventListener('blur', () => {
        tooltip.style.opacity = 0;
      });

      textarea.addEventListener('input', () => {
        if (textarea._expanded) {
          textarea.style.height = textarea.scrollHeight + 2 + 'px';
        }
        checkExpandNeeded();
      });

      // Initial check
      checkExpandNeeded();
      window.addEventListener('resize', checkExpandNeeded);

      updateUI();

      // Keep expand/copy button disabled state in sync with textarea.disabled
      const copyBtn = wrapper.querySelector('.copy-btn');
      function syncButtonDisabled() {
        btn.disabled = textarea.disabled;
        // Hide expand button if textarea is disabled/loading
        if (textarea.disabled) {
          // If expanded, collapse before hiding
          if (textarea._expanded) {
            textarea._expanded = false;
            updateUI();
          }
          btn.style.display = 'none';
        } else {
          checkExpandNeeded();
        }
        if (copyBtn) copyBtn.disabled = textarea.disabled;
      }
      syncButtonDisabled();
      // Observe disabled attribute
      const observer = new MutationObserver(syncButtonDisabled);
      observer.observe(textarea, { attributes: true, attributeFilter: ['disabled'] });
    }

    function setTextareaLoadingState(textarea, isLoading) {
      const wrapper = textarea.closest('.copy-textarea-wrapper') || textarea.closest('.textarea-expand-wrapper');
      if (!wrapper) return;
      const copyBtn = wrapper.querySelector('.copy-btn');
      const expandBtn = wrapper.querySelector('.expand-arrow-btn');
      if (copyBtn) copyBtn.disabled = isLoading;
      if (expandBtn) {
        expandBtn.disabled = isLoading;
        // Hide expand button immediately if loading/disabled, show if not and needed
        if (isLoading || textarea.disabled) {
          // If expanded, collapse before hiding
          if (textarea.classList.contains('expanded-textarea')) {
            expandBtn.classList.remove('expanded');
            textarea.classList.remove('expanded-textarea');
            expandBtn.setAttribute('aria-label', getLocaleText('expand'));
            textarea.style.height = '';
            textarea.style.maxHeight = '';
            textarea.style.resize = '';
          }
          expandBtn.style.display = 'none';
        } else {
          // Only show if content is long enough
          textarea.style.height = '';
          if (textarea.scrollHeight > textarea.clientHeight + 2) {
            expandBtn.style.display = '';
          } else {
            expandBtn.style.display = 'none';
          }
        }
      }
    }

    // Patch window for global access from transcriber/summarizer
    window.setTextareaLoadingState = setTextareaLoadingState;
    window.setupUniversalExpandButtons = setupUniversalExpandButtons;

    setupUniversalExpandButtons();

    // === Section-level disabling logic ===
    // (re-use recordedFile from above, do not redeclare)
    const transcribeSectionContent = document.getElementById('transcribeSectionContent');
    const summarizeSectionContent = document.getElementById('summarizeSectionContent');
    const transcribeOverlay = transcribeSectionContent.querySelector('.section-disabled-overlay');
    const transcribeTooltip = document.getElementById('transcribeSectionTooltip');
    const summarizeOverlay = summarizeSectionContent.querySelector('.section-disabled-overlay');
    const summarizeTooltip = document.getElementById('summarizeSectionTooltip');
    // const recordedFile = document.getElementById('recordedFile'); // already declared above
    const transcriptionBox = document.getElementById('transcriptionBox');

    function updateSectionDisabling() {
      // Disable only the Transcribe button if no recording, NOT the textarea
      const hasRecording = recordedFile.files && recordedFile.files.length > 0;
      const transcribeButton = document.getElementById('transcribeButton');
      if (!hasRecording) {
        transcribeButton.disabled = true;
        transcribeButton.classList.add('section-disabled-btn');
        transcribeButton.style.cursor = 'not-allowed';
        transcribeButton.setAttribute('data-tooltip', getLocaleText('transcribe_section_disabled_tooltip'));
      } else {
        transcribeButton.disabled = false;
        transcribeButton.classList.remove('section-disabled-btn');
        transcribeButton.style.cursor = '';
        transcribeButton.removeAttribute('data-tooltip');
      }
      // Remove overlay/tooltip logic for transcribe section
      transcribeSectionContent.classList.remove('section-disabled');
      transcribeOverlay.style.display = 'none';
      transcribeTooltip.style.display = 'none';

      // Summarize section: only disable the button if transcription is empty
      const summarizeButton = document.getElementById('summarizeButton');
      const hasTranscription = transcriptionBox.value && transcriptionBox.value.trim().length > 0;
      if (!hasTranscription) {
        summarizeButton.disabled = true;
        summarizeButton.classList.add('section-disabled-btn');
        summarizeButton.style.cursor = 'not-allowed';
        summarizeButton.setAttribute('data-tooltip', getLocaleText('summarize_section_disabled_tooltip'));
      } else {
        summarizeButton.disabled = false;
        summarizeButton.classList.remove('section-disabled-btn');
        summarizeButton.style.cursor = '';
        summarizeButton.removeAttribute('data-tooltip');
      }
      // Remove overlay/tooltip logic for summarize section
      summarizeSectionContent.classList.remove('section-disabled');
      summarizeOverlay.style.display = 'none';
      summarizeTooltip.style.display = 'none';
    }

    // --- Tooltip follow cursor logic for disabled overlays ---
    function setupFollowCursorTooltip(overlay, tooltip) {
      function showTooltip(e) {
        tooltip.classList.add('visible');
        tooltip.style.opacity = '1';
        tooltip.style.display = 'block';
        if (e) {
          const offsetX = 18;
          const offsetY = 18;
          tooltip.style.left = (e.clientX + offsetX) + 'px';
          tooltip.style.top = (e.clientY + offsetY) + 'px';
        }
      }
      function hideTooltip() {
        tooltip.classList.remove('visible');
        tooltip.style.opacity = '0';
        tooltip.style.display = 'none';
      }
      overlay.addEventListener('mouseenter', showTooltip);
      overlay.addEventListener('mousemove', showTooltip);
      overlay.addEventListener('mouseleave', hideTooltip);
      overlay.addEventListener('focus', (e) => {
        showTooltip(e);
        // Place tooltip near overlay center if no mouse event
        if (!e || (!e.clientX && !e.clientY)) {
          const rect = overlay.getBoundingClientRect();
          tooltip.style.left = (rect.left + rect.width/2) + 'px';
          tooltip.style.top = (rect.top + 32) + 'px';
        }
      });
      overlay.addEventListener('blur', hideTooltip);
    }
    setupFollowCursorTooltip(transcribeOverlay, transcribeTooltip);
    setupFollowCursorTooltip(summarizeOverlay, summarizeTooltip);

    // Show tooltip on overlay hover/focus
    transcribeOverlay.addEventListener('mouseenter', () => {
      transcribeTooltip.style.display = 'block';
    });
    transcribeOverlay.addEventListener('mouseleave', () => {
      transcribeTooltip.style.display = 'none';
    });
    transcribeOverlay.addEventListener('focus', () => {
      transcribeTooltip.style.display = 'block';
    });
    transcribeOverlay.addEventListener('blur', () => {
      transcribeTooltip.style.display = 'none';
    });
    summarizeOverlay.addEventListener('mouseenter', () => {
      summarizeTooltip.style.display = 'block';
    });
    summarizeOverlay.addEventListener('mouseleave', () => {
      summarizeTooltip.style.display = 'none';
    });
    summarizeOverlay.addEventListener('focus', () => {
      summarizeTooltip.style.display = 'block';
    });
    summarizeOverlay.addEventListener('blur', () => {
      summarizeTooltip.style.display = 'none';
    });

    // Update disabling on file/textarea changes
    recordedFile.addEventListener('change', updateSectionDisabling);
    transcriptionBox.addEventListener('input', updateSectionDisabling);
    // Also update on page load
    updateSectionDisabling();
    // Update tooltips on locale change
    onTranslationsUpdated(updateSectionDisabling);

    // --- Custom tooltip for disabled transcribe button ---
    let transcribeBtnTooltip = null;
    transcribeButton.addEventListener('mouseenter', function(e) {
      if (transcribeButton.disabled && transcribeButton.getAttribute('data-tooltip')) {
        if (!transcribeBtnTooltip) {
          transcribeBtnTooltip = document.createElement('div');
          transcribeBtnTooltip.className = 'section-disabled-tooltip visible';
          document.body.appendChild(transcribeBtnTooltip);
        }
        transcribeBtnTooltip.textContent = transcribeButton.getAttribute('data-tooltip');
        const offsetX = 2;
        const offsetY = 16;
        transcribeBtnTooltip.style.left = (e.clientX + offsetX) + 'px';
        transcribeBtnTooltip.style.top = (e.clientY + offsetY) + 'px';
        transcribeBtnTooltip.style.display = 'block';
      }
    });
    transcribeButton.addEventListener('mousemove', function(e) {
      if (transcribeBtnTooltip && transcribeBtnTooltip.style.display === 'block') {
        const offsetX = 2;
        const offsetY = 16;
        transcribeBtnTooltip.style.left = (e.clientX + offsetX) + 'px';
        transcribeBtnTooltip.style.top = (e.clientY + offsetY) + 'px';
      }
    });
    function hideTranscribeTooltip() {
      if (transcribeBtnTooltip) {
        transcribeBtnTooltip.style.display = 'none';
        if (transcribeBtnTooltip.parentNode) {
          transcribeBtnTooltip.parentNode.removeChild(transcribeBtnTooltip);
        }
        transcribeBtnTooltip = null;
      }
    }
    transcribeButton.addEventListener('mouseleave', hideTranscribeTooltip);
    window.addEventListener('scroll', hideTranscribeTooltip);
    window.addEventListener('blur', hideTranscribeTooltip);

    // --- Custom tooltip for disabled summarize button ---
    let summarizeBtnTooltip = null;
    const summarizeButton = document.getElementById('summarizeButton');
    summarizeButton.addEventListener('mouseenter', function(e) {
      if (summarizeButton.disabled && summarizeButton.getAttribute('data-tooltip')) {
        if (!summarizeBtnTooltip) {
          summarizeBtnTooltip = document.createElement('div');
          summarizeBtnTooltip.className = 'section-disabled-tooltip visible';
          document.body.appendChild(summarizeBtnTooltip);
        }
        summarizeBtnTooltip.textContent = summarizeButton.getAttribute('data-tooltip');
        const offsetX = 2;
        const offsetY = 16;
        summarizeBtnTooltip.style.left = (e.clientX + offsetX) + 'px';
        summarizeBtnTooltip.style.top = (e.clientY + offsetY) + 'px';
        summarizeBtnTooltip.style.display = 'block';
      }
    });
    summarizeButton.addEventListener('mousemove', function(e) {
      if (summarizeBtnTooltip && summarizeBtnTooltip.style.display === 'block') {
        const offsetX = 2;
        const offsetY = 16;
        summarizeBtnTooltip.style.left = (e.clientX + offsetX) + 'px';
        summarizeBtnTooltip.style.top = (e.clientY + offsetY) + 'px';
      }
    });
    function hideSummarizeTooltip() {
      if (summarizeBtnTooltip) {
        summarizeBtnTooltip.style.display = 'none';
        if (summarizeBtnTooltip.parentNode) {
          summarizeBtnTooltip.parentNode.removeChild(summarizeBtnTooltip);
        }
        summarizeBtnTooltip = null;
      }
    }
    summarizeButton.addEventListener('mouseleave', hideSummarizeTooltip);
    window.addEventListener('scroll', hideSummarizeTooltip);
    window.addEventListener('blur', hideSummarizeTooltip);
  });
});