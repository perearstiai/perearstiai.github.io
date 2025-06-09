import { getOpenAIKey, getSystemPrompt, getWrappedExamples, getLocaleText, onTranslationsUpdated, getAllProgressMessages } from '../components/settings.js';

let summarizerModel = 'gpt-4o'; // Default summarizer model
let summarizerModels = [];
let summarizerModelInfo = getSummarizerModelInfo() || { provider: null, modelName: null };

function getSummarizerModelInfo() {
  try {
    const raw = localStorage.getItem('summarizer_model_info');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}
function setSummarizerModelInfo(provider, modelName) {
  localStorage.setItem('summarizer_model_info', JSON.stringify({ provider, modelName }));
}

async function setupSummarizerModelDropdown() {
  const dropdownContainer = document.createElement('div');
  dropdownContainer.className = 'custom-dropdown';
  dropdownContainer.id = 'customSummarizerDropdown';
  dropdownContainer.tabIndex = 0;
  const selected = document.createElement('span');
  selected.className = 'custom-dropdown-selected';
  selected.id = 'customSummarizerSelected';
  dropdownContainer.appendChild(selected);
  const arrow = document.createElement('img');
  arrow.className = 'custom-dropdown-arrow';
  arrow.src = 'assets/img/arrow-right.svg';
  arrow.alt = '';
  arrow.setAttribute('aria-hidden', 'true');
  dropdownContainer.appendChild(arrow);
  const optionsList = document.createElement('ul');
  optionsList.className = 'custom-dropdown-options';
  optionsList.id = 'customSummarizerOptions';
  dropdownContainer.appendChild(optionsList);

  // Fetch summarizer models
  let providerModels = {};
  try {
    const res = await fetch('llm_apis/summarizers.json');
    const data = await res.json();
    providerModels = data.summarizers;
  } catch (e) {
    providerModels = { 'OpenAI': [{ modelName: 'gpt-4o', localeKey: 'summarize_model_openai_gpt4_o', default: true }] };
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
      li.textContent = getLocaleText(model.localeKey) || model.modelName;
      // Show provider: model in dropdown selected display
      if ((summarizerModelInfo.provider === provider && summarizerModelInfo.modelName === model.modelName) || (model.default && !foundSelected)) {
        li.classList.add('selected');
        selected.textContent = `${provider}: ${li.textContent}`;
        summarizerModelInfo = { provider, modelName: model.modelName };
        summarizerModel = model.modelName;
        setSummarizerModelInfo(provider, model.modelName);
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
      summarizerModelInfo = { provider, modelName };
      summarizerModel = modelName;
      setSummarizerModelInfo(provider, modelName);
      dropdownContainer.classList.remove('open');
    }
  });
  document.addEventListener('mousedown', (e) => {
    if (dropdownContainer.classList.contains('open') && !dropdownContainer.contains(e.target)) {
      dropdownContainer.classList.remove('open');
    }
  });

  // Insert dropdown and label/info text in a flex row above the textarea
  const summaryBox = document.getElementById('summaryBox');
  if (summaryBox) {
    let dropdownRow = document.getElementById('summarizerDropdownRow');
    if (!dropdownRow) {
      dropdownRow = document.createElement('div');
      dropdownRow.className = 'dropdown-row';
      dropdownRow.id = 'summarizerDropdownRow';
      summaryBox.parentElement.insertBefore(dropdownRow, summaryBox);
    }
    let label = document.getElementById('summaryModelDropdownLabel');
    if (!label) {
      label = document.createElement('span');
      label.id = 'summaryModelDropdownLabel';
      label.className = 'dropdown-label';
      label.textContent = getLocaleText('summarize_model');
      dropdownRow.appendChild(label);
    }
    dropdownRow.appendChild(dropdownContainer);
  }

  // When disabling/enabling dropdown, also set disabled attribute on all options for accessibility
  async function setDropdownDisabled(disabled) {
    const label = document.getElementById('summaryModelDropdownLabel');
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
  dropdownContainer.setDropdownDisabled = setDropdownDisabled;
}

export function setupSummarizer() {
  const summarizeButton = document.getElementById('summarizeButton');
  const summaryBox = document.getElementById('summaryBox');
  const summarizeInfoText = document.getElementById('summarizeInfoText');
  const summaryTimer = document.getElementById('summaryTimer');
  const spinner = document.getElementById('summarySpinner');

  // Store last info state for i18n updates
  let lastInfo = { type: null, dateStr: '', errorKey: '', errorMsg: '' };
  let timerInterval = null;
  let timerStart = null;
  let abortController = null;
  let isSummarizing = false;

  function setInfoText(msg, isError = false) {
    summarizeInfoText.textContent = msg;
    summarizeInfoText.className = 'info-text' + (isError ? ' info-error' : ' info-success');
  }

  function updateInfoTextI18n() {
    summaryBox.placeholder = getLocaleText('summary_placeholder') || 'Summary will appear here...';

    // Robust: clear progress message from any locale
    getAllProgressMessages().then(progressMessages => {
      if (!isSummarizing && progressMessages.some(msg => msg && summaryBox.value && summaryBox.value.trim().toLowerCase() === msg.trim().toLowerCase())) {
        summaryBox.value = '';
      }
    });

    if (lastInfo.type === 'waiting') {
      summaryBox.value = getLocaleText('summarizing_wait') || 'Summarizing...';
    } else if (lastInfo.type === 'success' && lastInfo.dateStr) {
      let label = getLocaleText('summarize_success') || '';
      label = label ? label + ' ' : '';
      setInfoText(`${label}${lastInfo.dateStr}`, false);
    } else if (lastInfo.type === 'fail' && lastInfo.errorKey) {
      summaryBox.value = '';
      let label = getLocaleText('summarize_fail') || '';
      let errorText = getLocaleText(lastInfo.errorKey) || '';
      setInfoText(`${label} ${errorText}`, true);
    }
    if (lastInfo.type === 'success' || lastInfo.type === 'fail')
      return;

    if (isSummarizing) {
      summarizeButton.textContent = getLocaleText('stop');
      summaryBox.value = getLocaleText('summarizing_wait');
    }
    
  }
  onTranslationsUpdated(updateInfoTextI18n);

  function startSummaryTimer() {
    timerStart = Date.now();
    summaryTimer.style.display = 'block';
    summaryTimer.textContent = '0.0s';
    timerInterval = setInterval(() => {
      const elapsed = (Date.now() - timerStart) / 1000;
      summaryTimer.textContent = elapsed.toFixed(1) + 's';
    }, 100);
  }
  function stopSummaryTimer() {
    summaryTimer.style.display = 'none';
    summaryTimer.textContent = '';
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
  }

  let dropdown = document.getElementById('customSummarizerDropdown');
  function setDropdownStateDuringSummarize(disabled) {
    // Always get the dropdown fresh in case it was re-injected
    const dropdown = document.getElementById('customSummarizerDropdown');
    if (dropdown && dropdown.setDropdownDisabled) dropdown.setDropdownDisabled(disabled);
  }

  summarizeButton.addEventListener('click', async () => {
    if (isSummarizing) {
      if (abortController) abortController.abort();
      summarizeButton.disabled = true;
      summaryBox.value = getLocaleText('cancelling') || 'Cancelling...';
      // Reset timer to 0.0s and keep visible, and reset timerStart
      summaryTimer.style.display = 'block';
      summaryTimer.textContent = '0.0s';
      timerStart = Date.now();
      // Do not show info text yet; will show after process is actually cancelled in catch/finally
      return;
    }

    const apiKey = getOpenAIKey().trim();
    const content = transcriptionBox.value.trim();
    const examples = getWrappedExamples().trim();
    let systemPrompt = getSystemPrompt().trim();

    summarizeInfoText.textContent = '';
    summarizeInfoText.className = 'info-text';
    lastInfo = { type: null, dateStr: '', errorKey: '', errorMsg: '' };

    if (!apiKey) {
      setInfoText(getLocaleText('error_incorrect_api_key') || 'Please enter your OpenAI API key in settings.', true);
      return;
    }
    if (!content) {
      setInfoText(getLocaleText('summarize_section_disabled_tooltip') || 'Provide transcription first', true);
      return;
    }

    isSummarizing = true;
    abortController = new AbortController();
    summarizeButton.textContent = getLocaleText('stop') || 'Stop';
    summarizeButton.classList.add('danger');
    summarizeButton.disabled = false;
    setDropdownStateDuringSummarize(true);

    lastInfo = { type: 'waiting', dateStr: '', errorKey: '', errorMsg: '' };
    summaryBox.value = getLocaleText('summarizing_wait') || 'Summarizing...';
    spinner.removeAttribute('hidden');
    spinner.style.display = 'block';
    summaryBox.classList.add('textarea-loading');
    summaryBox.disabled = true;
    if (window.setTextareaLoadingState) window.setTextareaLoadingState(summaryBox, true);
    startSummaryTimer();

    try {
      let model = summarizerModel;
      let selectedProvider = null;
      let selectedModelName = model;
      let providerModels = {};
      try {
        const res = await fetch('llm_apis/summarizers.json');
        const data = await res.json();
        providerModels = data.summarizers;
      } catch (e) {}
      outer: for (const [provider, models] of Object.entries(providerModels)) {
        for (const m of models) {
          if (m.modelName === model) {
            selectedProvider = provider;
            selectedModelName = m.modelName;
            break outer;
          }
        }
      }
      // Only OpenAI supported for now, but this is future-proof
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: selectedModelName,
          temperature: 0,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: content }
          ]
        }),
        signal: abortController.signal
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Summarization failed');
      }

      const data = await response.json();
      summaryBox.value = data.choices?.[0]?.message?.content || '[No summary returned]';
      // Info text: Generated from transcription in [dd/MM/YYYY, hh:mm:ss]
      const now = new Date();
      const pad = n => n.toString().padStart(2, '0');
      const dateStr = `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      lastInfo = { type: 'success', dateStr, errorKey: '', errorMsg: '' };
      updateInfoTextI18n();
      if (window.setupUniversalExpandButtons) window.setupUniversalExpandButtons();
    } catch (err) {
      summaryBox.value = '';
      let errorMsg = err.message || '';
      let errorKey = '';
      if (errorMsg === 'interrupted' || err.name === 'AbortError') {
        setInfoText(getLocaleText('interrupted') || 'Interrupted.', true); // Show info text only after cancellation is complete
      } else {
        // Locale-compliant error handling
        if (errorMsg.includes('Incorrect API key provided')) {
          errorKey = 'error_incorrect_api_key';
        } else if (errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('billing')) {
          errorKey = 'error_quota_exceeded';
        } else if (errorMsg.toLowerCase().includes('rate limit')) {
          errorKey = 'error_rate_limit';
        } else {
          errorKey = 'error_other';
          // Print original error for debugging
          console.error('API error:', err);
        }
        lastInfo = { type: 'fail', dateStr: '', errorKey, errorMsg };
        updateInfoTextI18n();
      }
      if (window.setupUniversalExpandButtons) window.setupUniversalExpandButtons();
    } finally {
      // Set flag to false before any i18n update can run
      isSummarizing = false;
      abortController = null;
      // Timer already stopped on cancel, but also stop here for normal completion
      stopSummaryTimer();
      spinner.setAttribute('hidden', '');
      spinner.style.display = 'none';
      summaryBox.classList.remove('textarea-loading');
      summaryBox.disabled = false;
      if (window.setTextareaLoadingState) window.setTextareaLoadingState(summaryBox, false);
      summarizeButton.textContent = getLocaleText('summary_button') || 'Summarize';
      summarizeButton.classList.remove('danger');
      summarizeButton.disabled = false;
      setDropdownStateDuringSummarize(false);
      // If cancelled, clear textarea and restore placeholder
      if (summaryBox.value === getLocaleText('cancelling') || summaryBox.value.toLowerCase().includes('cancelling')) {
        summaryBox.value = '';
        summaryBox.placeholder = getLocaleText('summary_placeholder') || 'Summary will appear here...';
      }
    }
  });

  // Restore placeholder from i18n
  if (summaryBox) {
    summaryBox.placeholder = getLocaleText('summary_placeholder') || 'Summary will appear here...';
  }
  // Move info text to be after the button in the row-group (do this only once, not at the end)
  if (summarizeButton && summarizeInfoText && summarizeButton.nextSibling !== summarizeInfoText) {
    summarizeButton.parentNode.insertBefore(summarizeInfoText, summarizeButton.nextSibling);
  }

  setupSummarizerModelDropdown();
}