let recordButton = document.getElementById('recordButton');
let timer = document.getElementById('timer');
let intervalId;
let isRecording = false;
let keyInput = document.getElementById('keyInput');
let setKeyButton = document.getElementById('setKeyButton');
let transcribeButton = document.getElementById('transcribeButton');
let transcriptionBox = document.getElementById('transcriptionBox');
let summarizeButton = document.getElementById('summarizeButton');
let summaryBox = document.getElementById('summaryBox');
let transcribedFile = document.getElementById('transcribedFile');
let recordedAudio = document.getElementById('recordedAudio');
let recordedFile = document.getElementById('recordedFile');
let keywordsBox = document.getElementById('keywordsBox');

recordedFile.addEventListener('change', () => {
    // Check if file is audio
    if (recordedFile.files[0].type.split('/')[0] != 'audio') {
        alert('File must be an audio file');
        return;
    }
    recordedAudio.src = URL.createObjectURL(recordedFile.files[0]);
});

transcribedFile.addEventListener('change', () => {
    let fr = new FileReader();
    fr.onload = () => {
        transcriptionBox.value = fr.result;
    }
    fr.readAsText(transcribedFile.files[0]);
});

summarizeButton.addEventListener('click', () => {
    let content = transcriptionBox.value;
    fetch('/summarize', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({content: content, keywords: keywordsBox.value})
    })
    .then(response => response.json())
    .then(data => {
        summaryBox.value = data.summary;
    });
});

transcribeButton.addEventListener('click', () => {
    fetch(recordedAudio.src)
    .then(response => response.blob()).then(blob => {
        let formData = new FormData();
        formData.append('recordedFile', blob);
        fetch('/transcribe', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            transcriptionBox.value = data.transcription;
        });
    });
});

setKeyButton.addEventListener('click', () => {
    let key = keyInput.value;
    fetch('/set_key', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({key: key})
    })
    .then(response => response.json())
    .then(data => {
        console.log(data);
    });
});


recordButton.addEventListener('click', () => {
    if (!isRecording) {
        // Start recording
        fetch('/start_recording', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            console.log(data);
            // Start updating the timer every second
            intervalId = setInterval(updateTimer, 1000);
            // Change button color to red
            recordButton.style.backgroundColor = "red";
            recordButton.textContent = "Stop Recording";
            isRecording = true;
        });
    } else {
        // Stop recording
        fetch('/stop_recording', { method: 'POST' })
        .then(response => response.blob())
        .then(data => {
            console.log(data);
            // Stop updating the timer
            clearInterval(intervalId);
            // Change button color back to initial color
            timer.textContent = "00:00:00";
            recordButton.style.backgroundColor = "";
            recordButton.textContent = "Start Recording";
            isRecording = false;
            // Download the recording
            let url = window.URL.createObjectURL(data);
            recordedAudio.src = url;
            recordedAudio.controls = true;
            // let a = document.createElement('a');
            // a.href = url;
            // a.download = 'recording.wav';
            // a.click();
        });
    }
});

updateTimer = () => {
    fetch('/get_time')
    .then(response => response.json())
    .then(data => {
        timer.textContent = data.time;
    });
}