import { getOpenAIKey, getLocaleText, onTranslationsUpdated } from '../components/settings.js';

export function setupTranscriber() {
  const transcribeButton = document.getElementById('transcribeButton');
  const recordedFile = document.getElementById('recordedFile');
  const transcriptionBox = document.getElementById('transcriptionBox');
  const transcribeInfoText = document.getElementById('transcribeInfoText');

  // Store last info state for i18n updates
  let lastInfo = { type: null, fileName: '', errorKey: '', errorMsg: '' };

  function setInfoText(msg, isError = false) {
    transcribeInfoText.textContent = msg;
    transcribeInfoText.className = 'info-text' + (isError ? ' info-error' : ' info-success');
  }

  function updateInfoTextI18n() {
    if (lastInfo.type === 'waiting') {
      transcriptionBox.value = getLocaleText('transcribing_wait') || 'Transcribing...';
    } else if (lastInfo.type === 'success' && lastInfo.fileName) {
      let label = getLocaleText('transcribe_success') || '';
      if (label && !/[\s:：]$/.test(label)) label += ':';
      setInfoText(`${label} ${lastInfo.fileName}`, false);
    } else if (lastInfo.type === 'fail' && lastInfo.errorKey) {
      let label = getLocaleText('transcribe_fail') || '';
      if (label && !/[\s:：!]$/.test(label)) label += ':';
      let errorText = getLocaleText(lastInfo.errorKey) || '';
      if (lastInfo.errorKey === 'error_other') errorText += ' ' + (lastInfo.errorMsg || '');
      setInfoText(`${label} ${errorText}`, true);
    }
  }
  onTranslationsUpdated(updateInfoTextI18n);

  transcribeButton.addEventListener('click', async () => {
    const apiKey = getOpenAIKey().trim();
    const file = recordedFile.files[0];
    const spinner = document.getElementById('transcriptionSpinner');

    transcribeInfoText.textContent = '';
    transcribeInfoText.className = 'info-text';
    lastInfo = { type: null, fileName: '', errorKey: '', errorMsg: '' };

    if (!apiKey) {
      setInfoText(getLocaleText('error_incorrect_api_key') || 'Please enter your OpenAI API key in settings.', true);
      return;
    }
    if (!file) {
      setInfoText(getLocaleText('transcribe_section_disabled_tooltip') || 'Provide recording first', true);
      return;
    }

    transcribeButton.disabled = true;
    lastInfo = { type: 'waiting', fileName: '', errorKey: '', errorMsg: '' };
    transcriptionBox.value = getLocaleText('transcribing_wait') || 'Transcribing...';
    spinner.removeAttribute('hidden');
    spinner.style.display = 'block';
    transcriptionBox.classList.add('textarea-loading');
    transcriptionBox.disabled = true;
    if (window.setTextareaLoadingState) window.setTextareaLoadingState(transcriptionBox, true);

    try {
      // --- OpenAI Whisper-specific code (commented out) ---
      /*
      const formData = new FormData();
      formData.append('file', file);
      formData.append('model', 'whisper-1');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Transcription failed');
      }

      const data = await response.json();
      transcriptionBox.value = data.text || '[No transcription returned]';
      lastInfo = { type: 'success', fileName: file.name, errorKey: '', errorMsg: '' };
      updateInfoTextI18n();
      if (window.setupUniversalExpandButtons) window.setupUniversalExpandButtons();
      */

      // --- Bark.cs.taltech.ee API implementation ---
      try {
        // Try sending the file as a FormData upload (like Whisper)
        const formData = new FormData();
        formData.append('file', file);
        // Try both 'file' and 'path' keys if needed
        // formData.append('path', file); // Uncomment if 'file' fails
        const barkResponse = await fetch('https://bark.cs.taltech.ee/subtitreeri/gradio_api/call/predict', {
          method: 'POST',
          body: formData
        });
        let barkJson;
        try {
          barkJson = await barkResponse.json();
        } catch (e) {
          throw new Error('API did not return JSON.');
        }
        const eventId = barkJson.data?.[0];
        if (!eventId) throw new Error('No event ID returned from API. Response: ' + JSON.stringify(barkJson));
        // Poll for the result
        const resultResponse = await fetch(`https://bark.cs.taltech.ee/subtitreeri/gradio_api/call/predict/${eventId}`);
        const resultText = await resultResponse.text();
        transcriptionBox.value = resultText || '[No transcription returned]';
        lastInfo = { type: 'success', fileName: file.name, errorKey: '', errorMsg: '' };
        updateInfoTextI18n();
        if (window.setupUniversalExpandButtons) window.setupUniversalExpandButtons();
      } catch (err) {
        transcriptionBox.value = '';
        let errorMsg = err.message || '';
        let errorKey = '';
        // Locale-compliant error handling
        if (errorMsg.includes('Incorrect API key provided')) {
          errorKey = 'error_incorrect_api_key';
        } else if (errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('billing')) {
          errorKey = 'error_quota_exceeded';
        } else if (errorMsg.toLowerCase().includes('rate limit')) {
          errorKey = 'error_rate_limit';
        } else {
          errorKey = 'error_other';
        }
        // Always print original error message in console
        console.error('API error:', err);
        lastInfo = { type: 'fail', fileName: '', errorKey, errorMsg };
        updateInfoTextI18n();
        if (window.setupUniversalExpandButtons) window.setupUniversalExpandButtons();
      }
    } finally {
      spinner.setAttribute('hidden', '');
      spinner.style.display = 'none';
      transcriptionBox.classList.remove('textarea-loading');
      transcriptionBox.disabled = false;
      if (window.setTextareaLoadingState) window.setTextareaLoadingState(transcriptionBox, false);
    }
  });
}