// Section-level disabling and tooltip logic for transcribe/summarize
import { getLocaleText, onTranslationsUpdated } from '../components/settings.js';

export function setupSectionDisabling() {
  const recordedFile = document.getElementById('recordedFile');
  const transcriptionBox = document.getElementById('transcriptionBox');
  const transcribeButton = document.getElementById('transcribeButton');
  const summarizeButton = document.getElementById('summarizeButton');

  function updateSectionDisabling() {
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
    // Summarize button
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
  }
  recordedFile.addEventListener('change', updateSectionDisabling);
  transcriptionBox.addEventListener('input', updateSectionDisabling);
  onTranslationsUpdated(updateSectionDisabling);
  updateSectionDisabling();

  // Tooltip logic for disabled buttons
  function setupBtnTooltip(btn, tooltipKey) {
    let tooltipDiv = null;
    function showTooltip(e) {
      if (btn.disabled && btn.getAttribute('data-tooltip')) {
        if (!tooltipDiv) {
          tooltipDiv = document.createElement('div');
          tooltipDiv.className = 'section-disabled-tooltip visible';
          document.body.appendChild(tooltipDiv);
        }
        tooltipDiv.textContent = btn.getAttribute('data-tooltip');
        const offsetX = 2, offsetY = 16;
        tooltipDiv.style.left = (e.clientX + offsetX) + 'px';
        tooltipDiv.style.top = (e.clientY + offsetY) + 'px';
        tooltipDiv.style.display = 'block';
      }
    }
    function moveTooltip(e) {
      if (tooltipDiv && tooltipDiv.style.display === 'block') {
        const offsetX = 2, offsetY = 16;
        tooltipDiv.style.left = (e.clientX + offsetX) + 'px';
        tooltipDiv.style.top = (e.clientY + offsetY) + 'px';
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
