// Sets up transcription logic and UI event listeners
export function setupTranscriber() {
  const transcribeButton = document.getElementById('transcribeButton');
  const recordedFile = document.getElementById('recordedFile');
  const transcriptionBox = document.getElementById('transcriptionBox');
  const keyInput = document.getElementById('keyInput');

  transcribeButton.addEventListener('click', async () => {
    const apiKey = keyInput.value.trim();
    const file = recordedFile.files[0];

    if (!apiKey) {
      alert('Please enter your OpenAI API key.');
      return;
    }
    if (!file) {
      alert('Please select or record an audio file first.');
      return;
    }

    transcriptionBox.value = 'Transcribing...';

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
    } catch (err) {
      transcriptionBox.value = 'Transcription failed: ' + err.message;
    }
  });
}