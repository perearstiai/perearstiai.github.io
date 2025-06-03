import { getOpenAIKey, getSystemPrompt, getWrappedExamples, getLocaleText, onTranslationsUpdated } from '../components/settings.js';

export function setupSummarizer() {
  const summarizeButton = document.getElementById('summarizeButton');
  const transcriptionBox = document.getElementById('transcriptionBox');
  const summaryBox = document.getElementById('summaryBox');
  const summarizeInfoText = document.getElementById('summarizeInfoText');
  const summaryTimer = document.getElementById('summaryTimer');
  const spinner = document.getElementById('summarySpinner');

  // Store last info state for i18n updates
  let lastInfo = { type: null, dateStr: '', errorKey: '', errorMsg: '' };
  let timerInterval = null;
  let timerStart = null;

  function setInfoText(msg, isError = false) {
    summarizeInfoText.textContent = msg;
    summarizeInfoText.className = 'info-text' + (isError ? ' info-error' : ' info-success');
  }

  function updateInfoTextI18n() {
    if (lastInfo.type === 'waiting') {
      summaryBox.value = getLocaleText('summarizing_wait') || 'Summarizing...';
    } else if (lastInfo.type === 'success' && lastInfo.dateStr) {
      let label = getLocaleText('summarize_success') || '';
      if (label && !/[\s:：]$/.test(label)) label += ' ';
      setInfoText(`${label}${lastInfo.dateStr}`, false);
    } else if (lastInfo.type === 'fail' && lastInfo.errorKey) {
      let label = getLocaleText('summarize_fail') || '';
      if (label && !/[\s:：!]$/.test(label)) label += ':';
      let errorText = getLocaleText(lastInfo.errorKey) || '';
      if (lastInfo.errorKey === 'error_other') errorText += ' ' + (lastInfo.errorMsg || '');
      setInfoText(`${label} ${errorText}`, true);
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

  summarizeButton.addEventListener('click', async () => {
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

    summarizeButton.disabled = true;
    lastInfo = { type: 'waiting', dateStr: '', errorKey: '', errorMsg: '' };
    summaryBox.value = getLocaleText('summarizing_wait') || 'Summarizing...';
    spinner.removeAttribute('hidden');
    spinner.style.display = 'block';
    summaryBox.classList.add('textarea-loading');
    summaryBox.disabled = true;
    if (window.setTextareaLoadingState) window.setTextareaLoadingState(summaryBox, true);
    startSummaryTimer();

    try {
      // Inject examples into system prompt if provided
      //if (examples) {
      systemPrompt += examples;
      //}

      // Debug: log the prompt sent to GPT-4.1
      console.log('[DEBUG] GPT-4.1 prompt:', systemPrompt);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4.1",
          temperature: 0,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: content }
          ]
        })
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
      if (window.setupUniversalExpandButtons) window.setupUniversalExpandButtons();
    } finally {
      stopSummaryTimer();
      spinner.setAttribute('hidden', '');
      spinner.style.display = 'none';
      summaryBox.classList.remove('textarea-loading');
      summaryBox.disabled = false;
      if (window.setTextareaLoadingState) window.setTextareaLoadingState(summaryBox, false);
      summarizeButton.disabled = false;
    }
  });

  // Add locale-compatible model/version label above summary textarea
  if (summaryBox) {
    let modelLabel = document.getElementById('summaryModelLabel');
    if (!modelLabel) {
      modelLabel = document.createElement('div');
      modelLabel.id = 'summaryModelLabel';
      modelLabel.className = 'textarea-model-label';
      // Insert as first child of wrapper (before copy/expand buttons)
      const wrapper = summaryBox.closest('.copy-textarea-wrapper, .textarea-expand-wrapper');
      if (wrapper) wrapper.insertBefore(modelLabel, wrapper.firstChild);
      else summaryBox.parentElement.insertBefore(modelLabel, summaryBox);
    }
    function updateModelLabel() {
      modelLabel.textContent = `${getLocaleText('model_label') || 'Model:'} OpenAI GPT-4.1`;
    }
    updateModelLabel();
    onTranslationsUpdated(updateModelLabel);
  }
}