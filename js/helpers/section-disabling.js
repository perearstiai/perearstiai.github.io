// Section-level disabling and tooltip logic for transcribe/summarize
import { getLocaleText, onTranslationsUpdated } from '../components/settings.js';

export function setupSectionDisabling() {
  const recordedFile = document.getElementById('recordedFile');
  const transcriptionBox = document.getElementById('transcriptionBox');
  const transcribeButton = document.getElementById('transcribeButton');
  const summarizeButton = document.getElementById('summarizeButton');

  function updateSectionDisabling() {
    // Prevent interfering with cancellation phase in transcriber.js
    if (window.__transcriberIsCancelling) return;
    // Transcribe button
    const hasRecording = recordedFile.files && recordedFile.files.length > 0;
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
    console.log('updateSectionDisabling called');
    // Summarize button
    const hasTranscription = transcriptionBox.value && transcriptionBox.value.trim().length > 0 && transcriptionBox.value.trim() !== getLocaleText('transcribing_wait');
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
  }
  recordedFile.addEventListener('change', updateSectionDisabling);
  transcriptionBox.addEventListener('input', updateSectionDisabling);
  transcriptionBox.addEventListener('transcription-updated', updateSectionDisabling);
  onTranslationsUpdated(updateSectionDisabling);
  updateSectionDisabling();
  window.addEventListener('recording-injected', updateSectionDisabling);

  // Tooltip logic for disabled buttons
  function setupBtnTooltip(btn, tooltipKey, opts = {}) {
    let tooltipDiv = null;
    function showTooltip(e) {
      if (btn.disabled && btn.getAttribute('data-tooltip')) {
        if (!tooltipDiv) {
          tooltipDiv = document.createElement('div');
          tooltipDiv.className = 'section-disabled-tooltip visible' + (opts.left ? ' left modal-tooltip' : '');
          document.body.appendChild(tooltipDiv);
        }
        tooltipDiv.textContent = btn.getAttribute('data-tooltip');
        // Positioning logic
        let left, top;
        if (opts.left) {
          // Left of cursor for other left tooltips
          const offsetX = -2, offsetY = 16;
          const width = tooltipDiv.offsetWidth || 120;
          left = e.clientX - width - offsetX;
          top = e.clientY + offsetY;
        } else {
          // Default: right of cursor
          const offsetX = 2, offsetY = 16;
          left = e.clientX + offsetX;
          top = e.clientY + offsetY;
        }
        tooltipDiv.style.left = left + 'px';
        tooltipDiv.style.top = top + 'px';
        tooltipDiv.style.display = 'block';
        tooltipDiv.style.zIndex = '2147483647';
      }
    }
    function moveTooltip(e) {
      if (tooltipDiv && tooltipDiv.style.display === 'block') {
        let left, top;
        if (opts.left) {
          const offsetX = -2, offsetY = 16;
          const width = tooltipDiv.offsetWidth || 120;
          left = e.clientX - width - offsetX;
          top = e.clientY + offsetY;
        } else {
          const offsetX = 2, offsetY = 16;
          left = e.clientX + offsetX;
          top = e.clientY + offsetY;
        }
        tooltipDiv.style.left = left + 'px';
        tooltipDiv.style.top = top + 'px';
      }
    }
    function hideTooltip() {
      if (tooltipDiv) {
        tooltipDiv.style.display = 'none';
        if (tooltipDiv.parentNode) tooltipDiv.parentNode.removeChild(tooltipDiv);
        tooltipDiv = null;
      }
    }
    btn.addEventListener('mouseenter', showTooltip);
    btn.addEventListener('mousemove', moveTooltip);
    btn.addEventListener('mouseleave', hideTooltip);
    window.addEventListener('scroll', hideTooltip);
    window.addEventListener('blur', hideTooltip);
  }
  setupBtnTooltip(transcribeButton, 'transcribe_section_disabled_tooltip');
  setupBtnTooltip(summarizeButton, 'summarize_section_disabled_tooltip');
}
