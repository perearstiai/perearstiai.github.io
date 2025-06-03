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
    const file = recordedFile.files[0];
    const spinner = document.getElementById('transcriptionSpinner');

    transcribeInfoText.textContent = '';
    transcribeInfoText.className = 'info-text';
    lastInfo = { type: null, fileName: '', errorKey: '', errorMsg: '' };

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
      const apiKey = getOpenAIKey().trim();
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

      // --- Gradio client via CDN implementation ---
      if (!window.__gradioClient) {
        window.__gradioClient = await import('https://cdn.jsdelivr.net/npm/@gradio/client/dist/index.min.js');
      }
      const { Client } = window.__gradioClient;
      const client = await Client.connect('https://bark.cs.taltech.ee/subtitreeri/');
      const result = await client.predict('/predict_1', { file_path: file });
      transcriptionBox.value = result.data?.[0] || '[No transcription returned]';
      lastInfo = { type: 'success', fileName: file.name, errorKey: '', errorMsg: '' };
      updateInfoTextI18n();
      if (window.setupUniversalExpandButtons) window.setupUniversalExpandButtons();
    } catch (err) {
      transcriptionBox.value = '';
      let errorMsg = err.message || '';
      let errorKey = 'error_other';
      console.error('API error:', err);
      lastInfo = { type: 'fail', fileName: '', errorKey, errorMsg };
      updateInfoTextI18n();
      if (window.setupUniversalExpandButtons) window.setupUniversalExpandButtons();
    } finally {
      spinner.setAttribute('hidden', '');
      spinner.style.display = 'none';
      transcriptionBox.classList.remove('textarea-loading');
      transcriptionBox.disabled = false;
      if (window.setTextareaLoadingState) window.setTextareaLoadingState(transcriptionBox, false);
    }
  });
}