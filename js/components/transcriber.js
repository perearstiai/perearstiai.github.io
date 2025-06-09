import { getOpenAIKey, getLocaleText, onTranslationsUpdated, getAllProgressMessages } from '../components/settings.js';


// Utility to get/set transcriber model+provider in localStorage
function getTranscriberModelInfo() {
  try {
    const raw = localStorage.getItem('transcriber_model_info');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}
function setTranscriberModelInfo(provider, modelName) {
  localStorage.setItem('transcriber_model_info', JSON.stringify({ provider, modelName }));
}
function dispatchTranscriptionUpdated() {
  const transcriptionBox = document.getElementById('transcriptionBox');
  if (transcriptionBox) {
    transcriptionBox.dispatchEvent(new Event('transcription-updated', { bubbles: true }));
  }
}

let transcriberModelInfo = getTranscriberModelInfo() || { provider: null, modelName: null };

async function setupTranscriberModelDropdown() {
  const dropdownContainer = document.createElement('div');
  dropdownContainer.className = 'custom-dropdown';
  dropdownContainer.id = 'customTranscriberDropdown';
  dropdownContainer.tabIndex = 0;
  const selected = document.createElement('span');
  selected.className = 'custom-dropdown-selected';
  selected.id = 'customTranscriberSelected';
  dropdownContainer.appendChild(selected);
  const arrow = document.createElement('img');
  arrow.className = 'custom-dropdown-arrow';
  arrow.src = 'assets/img/arrow-right.svg';
  arrow.alt = '';
  arrow.setAttribute('aria-hidden', 'true');
  dropdownContainer.appendChild(arrow);
  const optionsList = document.createElement('ul');
  optionsList.className = 'custom-dropdown-options';
  optionsList.id = 'customTranscriberOptions';
  dropdownContainer.appendChild(optionsList);

  // Fetch transcriber models
  let providerModels = {};
  try {
    const res = await fetch('llm_apis/transcribers.json');
    const data = await res.json();
    providerModels = data.transcribers;
  } catch (e) {
    providerModels = { 'TalTech': [{ modelName: 'whisper', localeKey: 'transcribe_model_taltech_whisper', default: true }] };
  }

  // Populate dropdown with optgroups by provider
  optionsList.innerHTML = '';
  let foundSelected = false;
  Object.entries(providerModels).forEach(([provider, models]) => {
    const groupLi = document.createElement('li');
    groupLi.textContent = provider;
    groupLi.className = 'custom-dropdown-group';
    optionsList.appendChild(groupLi);
    models.forEach(model => {
      const li = document.createElement('li');
      li.className = 'custom-dropdown-option';
      li.setAttribute('data-value', model.modelName);
      li.setAttribute('data-provider', provider);
      li.setAttribute('data-i18n', model.localeKey);
      li.textContent = getLocaleText(model.localeKey);
      // Show provider: model in dropdown selected display
      if ((transcriberModelInfo.provider === provider && transcriberModelInfo.modelName === model.modelName) || (model.default && !foundSelected)) {
        li.classList.add('selected');
        selected.textContent = `${provider}: ${li.textContent}`;
        transcriberModelInfo = { provider, modelName: model.modelName };
        setTranscriberModelInfo(provider, model.modelName);
        foundSelected = true;
      }
      optionsList.appendChild(li);
    });
  });

  // Dropdown logic
  dropdownContainer.addEventListener('mousedown', (e) => {
    if (!e.target.classList.contains('custom-dropdown-option')) {
      dropdownContainer.classList.toggle('open');
    }
  });
  optionsList.addEventListener('mousedown', (e) => {
    const option = e.target.closest('.custom-dropdown-option');
    if (option && optionsList.contains(option)) {
      optionsList.querySelectorAll('.custom-dropdown-option').forEach(opt => opt.classList.remove('selected'));
      option.classList.add('selected');
      const provider = option.getAttribute('data-provider');
      const modelName = option.getAttribute('data-value');
      selected.textContent = `${provider}: ${option.textContent}`;
      transcriberModelInfo = { provider, modelName };
      setTranscriberModelInfo(provider, modelName);
      dropdownContainer.classList.remove('open');
    }
  });
  document.addEventListener('mousedown', (e) => {
    if (dropdownContainer.classList.contains('open') && !dropdownContainer.contains(e.target)) {
      dropdownContainer.classList.remove('open');
    }
  });

  // Insert dropdown and label/info text in a flex row above the textarea
  const transcriptionBox = document.getElementById('transcriptionBox');
  if (transcriptionBox) {
    let dropdownRow = document.getElementById('transcriberDropdownRow');
    if (!dropdownRow) {
      dropdownRow = document.createElement('div');
      dropdownRow.className = 'dropdown-row';
      dropdownRow.id = 'transcriberDropdownRow';
      transcriptionBox.parentElement.insertBefore(dropdownRow, transcriptionBox);
    }
    let label = document.getElementById('transcriptionModelDropdownLabel');
    if (!label) {
      label = document.createElement('span');
      label.id = 'transcriptionModelDropdownLabel';
      label.className = 'dropdown-label';
      label.textContent = getLocaleText('transcribe_model');
      dropdownRow.appendChild(label);
    }
    dropdownRow.appendChild(dropdownContainer);
  }

  // When disabling/enabling dropdown, also set disabled attribute on all options for accessibility
  async function setDropdownDisabled(disabled) {
    const label = document.getElementById('transcriptionModelDropdownLabel');
    if (disabled) {
      dropdownContainer.classList.add('disabled');
      dropdownContainer.setAttribute('aria-disabled', 'true');
      if (label) label.classList.add('disabled');
      optionsList.querySelectorAll('.custom-dropdown-option').forEach(opt => opt.setAttribute('aria-disabled', 'true'));
    } else {
      dropdownContainer.classList.remove('disabled');
      dropdownContainer.removeAttribute('aria-disabled');
      if (label) label.classList.remove('disabled');
      optionsList.querySelectorAll('.custom-dropdown-option').forEach(opt => opt.removeAttribute('aria-disabled'));
    }
  }
  // Expose for use in transcribe logic
  dropdownContainer.setDropdownDisabled = setDropdownDisabled;
}

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
    transcriptionBox.placeholder = getLocaleText('transcription_placeholder') || 'Transcribed text will appear here...';
    document.getElementById('transcriptionModelDropdownLabel').textContent = getLocaleText('transcribe_model');

    // Robust: clear progress message from any locale
    getAllProgressMessages().then(progressMessages => {
      if (!isTranscribing && !isCancelling && progressMessages.some(msg => msg && transcriptionBox.value && transcriptionBox.value.trim().toLowerCase() === msg.trim().toLowerCase())) {
        transcriptionBox.value = '';
      }
    });

    if (lastInfo.type === 'waiting') {
      transcriptionBox.value = getLocaleText('transcribing_wait') || 'Transcribing...';
    } else if (lastInfo.type === 'success' && lastInfo.fileName) {
      let label = getLocaleText('transcribe_success') || '';
      setInfoText(`${label} ${lastInfo.fileName}`, false);
    } else if (lastInfo.type === 'fail' && lastInfo.errorKey) {
      transcriptionBox.value = '';
      let label = getLocaleText('transcribe_fail') || '';
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

  setupTranscriberModelDropdown();

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

  let dropdown = document.getElementById('customTranscriberDropdown');
  function setDropdownStateDuringTranscribe(disabled) {
    // Always get the dropdown fresh in case it was re-injected
    const dropdown = document.getElementById('customTranscriberDropdown');
    if (dropdown && dropdown.setDropdownDisabled) dropdown.setDropdownDisabled(disabled);
  }

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
      dispatchTranscriptionUpdated();
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
    setDropdownStateDuringTranscribe(true);
    dispatchTranscriptionUpdated();
    try {
      // Use transcriberModelInfo instead of getTranscriberModel
      const { provider: selectedProvider, modelName: selectedModelName } = transcriberModelInfo;
      let formattedText = '';
      let providerModels = {};
      try {
        const res = await fetch('llm_apis/transcribers.json');
        const data = await res.json();
        providerModels = data.transcribers;
      } catch (e) {}
      // If not set, fallback to first available model
      let provider = selectedProvider;
      let modelName = selectedModelName;
      if (!provider || !modelName) {
        outer: for (const [prov, models] of Object.entries(providerModels)) {
          for (const m of models) {
            provider = prov;
            modelName = m.modelName;
            break outer;
          }
        }
      }
      if (provider === 'OpenAI') {
        // --- OpenAI Whisper ---
        const apiKey = getOpenAIKey().trim();
        const formData = new FormData();
        formData.append('file', file);
        formData.append('model', modelName);
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
        abortController.signal.addEventListener('abort', () => {
          cancelled = true;
          if (resultIterator && resultIterator.cancel) resultIterator.cancel();
        });
        resultIterator = await client.submit('/predict', { file_path: file });
        let vttText = '';
        try {
          for await (const res of resultIterator) {
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
      // Set flags to false before any i18n update can run
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
      setDropdownStateDuringTranscribe(false);
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
      // If cancelled, clear textarea and restore placeholder
      if (transcriptionBox.value === getLocaleText('cancelling') || transcriptionBox.value.toLowerCase().includes('cancelling')) {
        transcriptionBox.value = '';
        transcriptionBox.placeholder = getLocaleText('transcription_placeholder') || 'Transcribed text will appear here...';
      }
    }
  });

  // Move info text to be after the button in the row-group (do this only once, not at the end)
  if (transcribeButton && transcribeInfoText && transcribeButton.nextSibling !== transcribeInfoText) {
    transcribeButton.parentNode.insertBefore(transcribeInfoText, transcribeButton.nextSibling);
  }

  // Restore placeholder from i18n
  if (transcriptionBox) {
    transcriptionBox.placeholder = getLocaleText('transcription_placeholder') || 'Transcribed text will appear here...';
  }

  // Make textarea interactive when not loading
  if (transcriptionBox) {
    transcriptionBox.readOnly = false;
    transcriptionBox.disabled = false;
  }
}