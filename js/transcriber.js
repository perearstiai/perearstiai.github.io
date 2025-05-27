import { getOpenAIKey } from './settings.js';

export function setupTranscriber() {
  const transcribeButton = document.getElementById('transcribeButton');
  const recordedFile = document.getElementById('recordedFile');
  const transcriptionBox = document.getElementById('transcriptionBox');

  transcribeButton.addEventListener('click', async () => {
    const apiKey = getOpenAIKey().trim();
    const file = recordedFile.files[0];
    const spinner = document.getElementById('transcriptionSpinner');

    if (!apiKey) {
      alert('Please enter your OpenAI API key in settings.');
      return;
    }
    if (!file) {
      alert('Please select or record an audio file first.');
      return;
    }

    transcribeButton.disabled = true;
    transcriptionBox.value = 'Transcribing...';
    spinner.removeAttribute('hidden');
    spinner.style.display = 'block';
    transcriptionBox.classList.add('textarea-loading');
    transcriptionBox.disabled = true;
    if (window.setTextareaLoadingState) window.setTextareaLoadingState(transcriptionBox, true);

    try {
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
      if (window.setupUniversalExpandButtons) window.setupUniversalExpandButtons();
    } catch (err) {
      transcriptionBox.value = 'Transcription failed: ' + err.message;
      if (window.setupUniversalExpandButtons) window.setupUniversalExpandButtons();
    } finally {
      spinner.setAttribute('hidden', '');
      spinner.style.display = 'none';
      transcriptionBox.classList.remove('textarea-loading');
      transcriptionBox.disabled = false;
      if (window.setTextareaLoadingState) window.setTextareaLoadingState(transcriptionBox, false);
      transcribeButton.disabled = false;
    }
  });
}