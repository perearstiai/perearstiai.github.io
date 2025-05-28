import { getLocaleText, onTranslationsUpdated } from '../components/settings.js';
import { computeElapsedTime, getFormattedTime } from '../helpers/utils.js';

export function setupRecorder() {
  const recordButton = document.getElementById('recordButton');
  const timer = document.getElementById('timer');
  const recordedFile = document.getElementById('recordedFile');
  const recordedAudio = document.getElementById('recordedAudio');
  const clearBtn = document.getElementById('clearRecordedFile');
  const downloadBtn = document.getElementById('downloadRecordedFile');
  const fileSourceIndicator = document.getElementById('recordedFileSource');
  const fileNameSpan = document.getElementById('recordedFileName');

  let isRecording = false;
  let intervalId = null;
  let startTime = null;
  let mediaRecorder = null;
  let audioBlobs = [];
  let streamBeingCaptured = null;
  let lastValidFile = null;
  let lastRecordedBlob = null;
  let audioFileName = null;

  let dynamicTextLocaleKeys = new Map([
    [fileSourceIndicator, null],
    [fileNameSpan, 'recording_no_file'],
  ]);

  function updateClearBtnVisibility() {
    // Show clear button if there is a file in the input (either uploaded or injected by recording)
    clearBtn.style.display = recordedFile.files && recordedFile.files.length > 0 ? '' : 'none';
  }


  function setPlaybackEnabled(enabled) {
    recordedAudio.controls = true;
    if (enabled) {
      recordedAudio.classList.remove('disabled-audio');
      recordedAudio.tabIndex = 0;
    } else {
      recordedAudio.classList.add('disabled-audio');
      recordedAudio.tabIndex = -1;
    }
  }
  function setFileSourceIndicator(source) {
    if (source === 'recorded') {
      fileSourceIndicator.textContent = getLocaleText('recording_file_source_recorded');
      dynamicTextLocaleKeys.set(fileSourceIndicator, 'recording_file_source_recorded');
      fileSourceIndicator.style.display = '';
    } else if (source === 'uploaded') {
      fileSourceIndicator.textContent = getLocaleText('recording_file_source_uploaded');
      dynamicTextLocaleKeys.set(fileSourceIndicator, 'recording_file_source_uploaded');
      fileSourceIndicator.style.display = '';
    } else {
      fileSourceIndicator.textContent = '';
      dynamicTextLocaleKeys.set(fileSourceIndicator, null);
      fileSourceIndicator.style.display = 'none';
    }
  }
  function setFileNameDisplay(name) {
    if(!name) {
      fileNameSpan.textContent = getLocaleText('recording_no_file');
      dynamicTextLocaleKeys.set(fileNameSpan, 'recording_no_file');
    } else {
      fileNameSpan.textContent = name;
      dynamicTextLocaleKeys.set(fileNameSpan, null);
    }
  }

  recordedFile.value = "";
  recordButton.textContent = getLocaleText("recording_start_button");
  downloadBtn.style.display = "none";
  timer.textContent = "00:00.00"; // Reset timer display
  setFileNameDisplay(null);
  setFileSourceIndicator(null);

  onTranslationsUpdated(() => {
    // Update dynamic button text
    recordButton.textContent = isRecording
      ? getLocaleText("recording_stop_button")
      : getLocaleText("recording_start_button");
    // Update other dynamic texts
    for (const [key,value] of dynamicTextLocaleKeys) {
      if (key && value) {
        key.textContent = getLocaleText(value);
      }
    }
  });

  async function startRecording() {
    if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
      alert('Audio recording is not supported in this browser.');
      return;
    }
    try {
      streamBeingCaptured = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(streamBeingCaptured);
      audioBlobs = [];

      mediaRecorder.addEventListener('dataavailable', event => {
        audioBlobs.push(event.data);
      });

      mediaRecorder.start();

      startTime = new Date();
      intervalId = setInterval(() => {
        timer.textContent = computeElapsedTime(startTime);
      }, 10);

      recordButton.style.backgroundColor = "red";
      recordButton.textContent = getLocaleText("recording_stop_button");
      isRecording = true;
    } catch (err) {
      alert('Could not start audio recording: ' + err.message);
    }
  }

  function stopRecording() {
    return new Promise(resolve => {
      if (!mediaRecorder) return resolve();

      mediaRecorder.addEventListener('stop', () => {
        stopStream();

        const audioBlob = new Blob(audioBlobs, { type: mediaRecorder.mimeType });
        audioFileName = "recording_" + getFormattedTime() + ".ogg";
        const audioFile = new File([audioBlob], audioFileName);

        setFileSourceIndicator('recorded');
        setFileNameDisplay(audioFileName);

        // Set file input for downstream processing
        const dt = new DataTransfer();
        dt.items.add(audioFile);
        recordedFile.files = dt.files;

        // Set audio preview
        recordedAudio.src = URL.createObjectURL(audioBlob);
        setPlaybackEnabled(true);

        // Remember as last valid file
        lastValidFile = audioFile;
        lastRecordedBlob = audioBlob;

        // Show download button if recorded in browser
        if (audioBlob.size > 0) {
          downloadBtn.style.display = "";
        } else {
          downloadBtn.style.display = "none";
        }

        updateClearBtnVisibility();

        resetRecordingProperties();
        resolve();
      }, { once: true });
      mediaRecorder.stop();
    });
  }

  function stopStream() {
    if (streamBeingCaptured) {
      streamBeingCaptured.getTracks().forEach(track => track.stop());
    }
  }

  function resetRecordingProperties() {
    mediaRecorder = null;
    streamBeingCaptured = null;
  }

  recordButton.addEventListener('click', async () => {
    if (!isRecording) {
      await startRecording();
    } else {
      await stopRecording();
      clearInterval(intervalId);
      recordButton.style.backgroundColor = "";
      recordButton.textContent = getLocaleText("recording_start_button");
      isRecording = false;
    }
  });

  recordedFile.addEventListener('change', () => {
    const file = recordedFile.files[0];
    if (!file) {
      setFileSourceIndicator(null);
      setFileNameDisplay('');
      recordedAudio.pause();
      recordedAudio.removeAttribute('src');
      recordedAudio.load();
      setPlaybackEnabled(false);
      lastValidFile = null;
      lastRecordedBlob = null;
      downloadBtn.style.display = "none";
      return;
    }
    if (!file.type.startsWith('audio')) {
      alert('File must be an audio file');
      if (lastValidFile) {
        const dt = new DataTransfer();
        dt.items.add(lastValidFile);
        recordedFile.files = dt.files;
        recordedAudio.src = URL.createObjectURL(lastValidFile);
        setPlaybackEnabled(true);
        downloadBtn.style.display = lastRecordedBlob ? "" : "none";
      } else {
        recordedFile.value = "";
        setPlaybackEnabled(false);
        downloadBtn.style.display = "none";
      }
      return;
    }
    setFileSourceIndicator('uploaded');
    setFileNameDisplay(file.name);
    recordedAudio.src = URL.createObjectURL(file);
    setPlaybackEnabled(true);
    lastValidFile = file;
    lastRecordedBlob = null;
    downloadBtn.style.display = "none";
    timer.textContent = "00:00.00"; // Reset timer display
    updateClearBtnVisibility();
  });

  // --- File clear button logic (moved from main.js) ---
  function updateClearRecordedFileBtn() {
    clearBtn.style.display = recordedFile.files.length > 0 ? '' : 'none';
  }
  recordedFile.addEventListener('change', updateClearRecordedFileBtn);
  clearBtn.addEventListener('click', () => {
    recordedFile.value = '';
    timer.textContent = '00:00.00';
    recordedFile.dispatchEvent(new Event('change', { bubbles: true }));
  });
  updateClearBtnVisibility();
  updateClearRecordedFileBtn();

  // Download logic
  downloadBtn.addEventListener('click', () => {
    if (lastRecordedBlob) {
      const url = URL.createObjectURL(lastRecordedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = audioFileName; // Use the same name as above
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    }
  });

  // Disable controls if no file
  setPlaybackEnabled(false);
}