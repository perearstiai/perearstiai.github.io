import { getOpenAIKey, getLocaleText, onTranslationsUpdated, getTranscribeModel } from '../components/settings.js';

let modelLabel, updateModelLabel;

export function setupTranscriber() {
  const transcribeButton = document.getElementById('transcribeButton');
  const recordedFile = document.getElementById('recordedFile');
  const transcriptionBox = document.getElementById('transcriptionBox');
  const transcribeInfoText = document.getElementById('transcribeInfoText');
  const transcriptionTimer = document.getElementById('transcriptionTimer');
  let timerInterval = null;
  let timerStart = null;

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

  function startTranscriptionTimer() {
    timerStart = Date.now();
    transcriptionTimer.style.display = 'block';
    transcriptionTimer.textContent = '0.0s';
    timerInterval = setInterval(() => {
      const elapsed = (Date.now() - timerStart) / 1000;
      transcriptionTimer.textContent = elapsed.toFixed(1) + 's';
    }, 100);
  }
  function stopTranscriptionTimer() {
    transcriptionTimer.style.display = 'none';
    transcriptionTimer.textContent = '';
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
  }

  // Add locale-compatible model/version label above textarea
  if (transcriptionBox) {
    modelLabel = document.getElementById('transcriptionModelLabel');
    if (!modelLabel) {
      modelLabel = document.createElement('div');
      modelLabel.id = 'transcriptionModelLabel';
      modelLabel.className = 'textarea-model-label';
      // Insert as first child of wrapper (before copy/expand buttons)
      const wrapper = transcriptionBox.closest('.copy-textarea-wrapper, .textarea-expand-wrapper');
      if (wrapper) wrapper.insertBefore(modelLabel, wrapper.firstChild);
      else transcriptionBox.parentElement.insertBefore(modelLabel, transcriptionBox);
    }
    updateModelLabel = function() {
      const model = getTranscribeModel();
      let modelName = model === 'openai'
        ? getLocaleText('settings_transcribe_model_openai') || 'OpenAI Whisper v1'
        : getLocaleText('settings_transcribe_model_taltech') || 'TalTech Whisper';
      modelLabel.textContent = `${getLocaleText('model_label') || 'Model:'} ${modelName}`;
    };
    updateModelLabel();
    onTranslationsUpdated(updateModelLabel);
    // Also update when settings modal closes (in case model changed)
    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal) {
      settingsModal.addEventListener('close', updateModelLabel);
    }
  }

  let abortController = null;
  let isTranscribing = false;
  let isCancelling = false;

  // Patch: prevent disabling stop button during transcription if file is removed
  recordedFile.addEventListener('change', () => {
    if (isTranscribing && !isCancelling) {
      // Do NOT disable the button if transcribing (stop must always be available)
      transcribeButton.disabled = false;
      transcribeButton.classList.remove('section-disabled-btn');
      transcribeButton.style.cursor = '';
      transcribeButton.removeAttribute('data-tooltip');
    } else if (isCancelling) {
      // During cancellation, do not change the button state at all
      // (leave as disabled)
      return;
    }
  });

  transcribeButton.addEventListener('click', async () => {
    if (isTranscribing) {
      // Cancel
      if (abortController) abortController.abort();
      isCancelling = true;
      window.__transcriberIsCancelling = true;
      transcribeButton.disabled = true;
      transcriptionBox.value = getLocaleText('cancelling') || 'Cancelling...';
      // Reset timer to 0.0s and keep visible, and reset timerStart
      transcriptionTimer.style.display = 'block';
      transcriptionTimer.textContent = '0.0s';
      timerStart = Date.now();
      // Do not show info text yet; will show after process is actually cancelled in catch/finally
      return;
    }

    const file = recordedFile.files[0];
    const spinner = document.getElementById('transcriptionSpinner');

    transcribeInfoText.textContent = '';
    transcribeInfoText.className = 'info-text';
    lastInfo = { type: null, fileName: '', errorKey: '', errorMsg: '' };

    if (!file) {
      // Only disable if not already transcribing
      if (!isTranscribing) {
        transcribeButton.disabled = true;
      }
      setInfoText(getLocaleText('transcribe_section_disabled_tooltip') || 'Provide recording first', true);
      return;
    }
    isTranscribing = true;
    isCancelling = false;
    window.__transcriberIsCancelling = false;
    abortController = new AbortController();
    transcribeButton.textContent = getLocaleText('stop') || 'Stop';
    transcribeButton.classList.add('danger');
    transcribeButton.disabled = false;

    lastInfo = { type: 'waiting', fileName: '', errorKey: '', errorMsg: '' };
    transcriptionBox.value = getLocaleText('transcribing_wait') || 'Transcribing...';
    spinner.removeAttribute('hidden');
    spinner.style.display = 'block';
    transcriptionBox.classList.add('textarea-loading');
    transcriptionBox.disabled = true;
    if (window.setTextareaLoadingState) window.setTextareaLoadingState(transcriptionBox, true);
    startTranscriptionTimer();
    try {
      const model = getTranscribeModel();
      let formattedText = '';
      if (model === 'openai') {
        // --- OpenAI Whisper ---
        const apiKey = getOpenAIKey().trim();
        if (!apiKey) throw new Error(getLocaleText('error_incorrect_api_key') || 'Please enter your OpenAI API key in settings.');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('model', 'whisper-1');
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}` },
          body: formData,
          signal: abortController.signal
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || 'Transcription failed');
        }
        const data = await response.json();
        formattedText = data.text || '[No transcription returned]';
      } else {
        // --- TalTech (default) ---
        if (!window.__gradioClient) {
          window.__gradioClient = await import('https://cdn.jsdelivr.net/npm/@gradio/client/dist/index.min.js');
        }
        const { Client } = window.__gradioClient;
        // Gradio client does not support AbortController, so we simulate cancel by skipping result if aborted
        let localAbort = false;
        abortController.signal.addEventListener('abort', () => { localAbort = true; });
        const client = await Client.connect('https://bark.cs.taltech.ee/subtitreeri/');
        const result = await client.predict('/predict', { file_path: file });
        if (localAbort) throw new Error('interrupted');
        let vttText = result.data?.[0] || '[No transcription returned]';
        formattedText = vttText
          .replace(/^WEBVTT\s*/i, '')
          .replace(/\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}\n/g, '')
          .replace(/^\s*[\r\n]/gm, '')
          .replace(/^\d+\s*$/gm, '');
      }
      transcriptionBox.value = formattedText || '[No transcription returned]';
      lastInfo = { type: 'success', fileName: file.name, errorKey: '', errorMsg: '' };
      updateInfoTextI18n();
      if (window.setupUniversalExpandButtons) window.setupUniversalExpandButtons();
    } catch (err) {
      transcriptionBox.value = '';
      let errorMsg = err.message || '';
      let errorKey = 'error_other';
      if (errorMsg === 'interrupted' || err.name === 'AbortError') {
        setInfoText(getLocaleText('interrupted') || 'Interrupted.', true); // Show info text only after cancellation is complete
      } else {
        console.error('API error:', err);
        lastInfo = { type: 'fail', fileName: '', errorKey, errorMsg };
        updateInfoTextI18n();
      }
      if (window.setupUniversalExpandButtons) window.setupUniversalExpandButtons();
    } finally {
      isTranscribing = false;
      isCancelling = false;
      window.__transcriberIsCancelling = false;
      abortController = null;
      // Timer already stopped on cancel, but also stop here for normal completion
      stopTranscriptionTimer();
      spinner.setAttribute('hidden', '');
      spinner.style.display = 'none';
      transcriptionBox.classList.remove('textarea-loading');
      transcriptionBox.disabled = false;
      if (window.setTextareaLoadingState) window.setTextareaLoadingState(transcriptionBox, false);
      transcribeButton.textContent = getLocaleText('transcription_button') || 'Transcribe';
      transcribeButton.classList.remove('danger');
      // Only disable if no file is present after completion/cancel, and not cancelling
      if (!recordedFile.files[0]) {
        transcribeButton.disabled = true;
        transcribeButton.classList.add('section-disabled-btn');
        transcribeButton.style.cursor = 'not-allowed';
        transcribeButton.setAttribute('data-tooltip', getLocaleText('transcribe_section_disabled_tooltip'));
      } else if (!isCancelling) {
        transcribeButton.disabled = false;
        transcribeButton.classList.remove('section-disabled-btn');
        transcribeButton.style.cursor = '';
        transcribeButton.removeAttribute('data-tooltip');
      }
    }
  });
}