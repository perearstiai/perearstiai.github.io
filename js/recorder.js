import { computeElapsedTime, getFormattedTime } from './utils.js';

// TODO when page is refreshed, clear the prev file name as well

export function setupRecorder() {
  const recordButton = document.getElementById('recordButton');
  const timer = document.getElementById('timer');
  const recordedFile = document.getElementById('recordedFile');
  const recordedAudio = document.getElementById('recordedAudio');

  let isRecording = false;
  let intervalId = null;
  let startTime = null;
  let mediaRecorder = null;
  let audioBlobs = [];
  let streamBeingCaptured = null;
  let lastValidFile = null;

  // Helper to visually and functionally disable playback
  function setPlaybackEnabled(enabled) {
    recordedAudio.controls = true; // Always show controls
    if (enabled) {
      recordedAudio.classList.remove('disabled-audio');
      recordedAudio.tabIndex = 0;
    } else {
      recordedAudio.classList.add('disabled-audio');
      recordedAudio.tabIndex = -1;
    }
  }

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
        const audioBlob = new Blob(audioBlobs, { type: mediaRecorder.mimeType });
        const audioFileName = "recording_" + getFormattedTime() + ".webm";
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

        resolve();
      });

      mediaRecorder.stop();
      stopStream();
      resetRecordingProperties();
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
      } else {
        recordedFile.value = "";
        recordedAudio.src = "";
        setPlaybackEnabled(false);
      }
      return;
    }
    recordedAudio.src = URL.createObjectURL(file);
    setPlaybackEnabled(true);
    lastValidFile = file;
  });

  // On load, always show controls but disable if no file
  setPlaybackEnabled(false);
}