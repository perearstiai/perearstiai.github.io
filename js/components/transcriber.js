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

  let abortController = null;
  let isTranscribing = false;
  let isCancelling = false;

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
      transcriptionBox.value = '';
      let label = getLocaleText('transcribe_fail') || '';
      if (label && !/[\s:：!]$/.test(label)) label += ':';
      let errorText = getLocaleText(lastInfo.errorKey) || '';
      setInfoText(`${label} ${errorText}`, true);
    }
    if (lastInfo.type === 'success' || lastInfo.type === 'fail')
      return;
    
    if (isTranscribing) {
      transcribeButton.textContent = getLocaleText('stop');
      transcriptionBox.value = getLocaleText('transcribing_wait');
    } else if (isCancelling) {
      transcribeButton.textContent = getLocaleText('stop');
      transcriptionBox.value = getLocaleText('cancelling');
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
        ? getLocaleText('settings_transcribe_model_openai')
        : getLocaleText('settings_transcribe_model_taltech');
      modelLabel.textContent = `${getLocaleText('model_label')} ${modelName}`;
    };
    updateModelLabel();
    onTranslationsUpdated(updateModelLabel);
    // Also update when settings modal closes (in case model changed)
    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal) {
      settingsModal.addEventListener('close', updateModelLabel);
    }
  }

  // Prevent disabling stop button during transcription if file is removed
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
        const client = await Client.connect('https://bark.cs.taltech.ee/subtitreeri/');
        let resultIterator;
        let cancelled = false;
        // Setup abort logic
        abortController.signal.addEventListener('abort', () => {
          cancelled = true;
          if (resultIterator && resultIterator.cancel) resultIterator.cancel();
        });
        // Use submit (async iterator)
        resultIterator = await client.submit('/predict', { file_path: file });
        let vttText = '';
        try {
          for await (const res of resultIterator) {
            // Only the last chunk is the final result
            if (res && res.data && res.data[0]) {
              vttText = res.data[0];
            }
          }
        } catch (e) {
          if (cancelled) throw new Error('interrupted');
        }
        if (cancelled) throw new Error('interrupted');
        formattedText = vttText
          ? vttText.replace(/^WEBVTT\s*/i, '')
              .replace(/\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}\n/g, '')
              .replace(/^\s*[\r\n]/gm, '')
              .replace(/^\d+\s*$/gm, '')
          : '[No transcription returned]';
      }
      transcriptionBox.value = formattedText || '[No transcription returned]';
      lastInfo = { type: 'success', fileName: file.name, errorKey: '', errorMsg: '' };
      updateInfoTextI18n();
      if (window.setupUniversalExpandButtons) window.setupUniversalExpandButtons();
    } catch (err) {
      transcriptionBox.value = '';
      let eMsg = err.message || '';
      let eKey = '';
      if (eMsg.includes('Incorrect API key provided')) {
        eMsg = getLocaleText('error_incorrect_api_key')
        eKey = 'error_incorrect_api_key';
      } else {
        eKey = 'error_other';
      }
      if (eMsg === 'interrupted' || err.name === 'AbortError') {
        setInfoText(getLocaleText('interrupted') || 'Interrupted.', true); // Show info text only after cancellation is complete
        transcriptionBox.value = '';
      } else {
        console.error('API error:', err);
        lastInfo = { type: 'fail', fileName: '', errorKey: eKey, errorMsg: eMsg };
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