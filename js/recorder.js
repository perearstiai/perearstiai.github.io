import { computeElapsedTime, getFormattedTime } from './utils.js';

export function setupRecorder() {
  const recordButton = document.getElementById('recordButton');
  const timer = document.getElementById('timer');
  const recordedFile = document.getElementById('recordedFile');
  const recordedAudio = document.getElementById('recordedAudio');
  const clearBtn = document.getElementById('clearRecordedFile');
  const downloadBtn = document.getElementById('downloadRecordedFile');

  let isRecording = false;
  let intervalId = null;
  let startTime = null;
  let mediaRecorder = null;
  let audioBlobs = [];
  let streamBeingCaptured = null;
  let lastValidFile = null;
  let lastRecordedBlob = null;

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

  recordedFile.value = "";

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
      }, 1000);

      recordButton.style.backgroundColor = "red";
      recordButton.textContent = "Stop Recording";
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
        const audioFileName = "recording_" + getFormattedTime() + ".wav";
        const audioFile = new File([audioBlob], audioFileName);

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
      timer.textContent = "00:00";
      recordButton.style.backgroundColor = "";
      recordButton.textContent = "Start Recording";
      isRecording = false;
    }
  });

  recordedFile.addEventListener('change', () => {
    const file = recordedFile.files[0];
    if (!file) {
      recordedAudio.src = "";
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
        recordedAudio.pause();
        recordedAudio.removeAttribute('src');
        recordedAudio.load();
        setPlaybackEnabled(false);
        downloadBtn.style.display = "none";
      }
      return;
    }
    recordedAudio.src = URL.createObjectURL(file);
    setPlaybackEnabled(true);
    lastValidFile = file;
    lastRecordedBlob = null;
    downloadBtn.style.display = "none";
  });

  // Clear file logic
  clearBtn.addEventListener('click', () => {
    recordedFile.value = "";
    recordedAudio.pause();
    recordedAudio.removeAttribute('src');
    recordedAudio.load();
    setPlaybackEnabled(false);
    lastValidFile = null;
    lastRecordedBlob = null;
    downloadBtn.style.display = "none";
    recordedFile.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // Download logic
  downloadBtn.addEventListener('click', () => {
    if (lastRecordedBlob) {
      const url = URL.createObjectURL(lastRecordedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'recording.wav';
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