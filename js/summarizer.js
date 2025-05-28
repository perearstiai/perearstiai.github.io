import { getOpenAIKey, getSystemPrompt, getExamples, getLocaleText, onTranslationsUpdated } from './settings.js';

export function setupSummarizer() {
  const summarizeButton = document.getElementById('summarizeButton');
  const transcriptionBox = document.getElementById('transcriptionBox');
  const summaryBox = document.getElementById('summaryBox');
  const summarizeInfoText = document.getElementById('summarizeInfoText');

  // Store last info state for i18n updates
  let lastInfo = { type: null, dateStr: '', errorKey: '', errorMsg: '' };

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

  summarizeButton.addEventListener('click', async () => {
    const apiKey = getOpenAIKey().trim();
    const content = transcriptionBox.value.trim();
    const examples = getExamples().trim();
    let systemPrompt = getSystemPrompt().trim();
    const spinner = document.getElementById('summarySpinner');

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

    try {
      // Inject examples into system prompt if provided
      if (examples) {
        systemPrompt += `\n\nHere are some examples for context:\n${examples}`;
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4-1106-preview",
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
      spinner.setAttribute('hidden', '');
      spinner.style.display = 'none';
      summaryBox.classList.remove('textarea-loading');
      summaryBox.disabled = false;
      if (window.setTextareaLoadingState) window.setTextareaLoadingState(summaryBox, false);
      summarizeButton.disabled = false;
    }
  });
}