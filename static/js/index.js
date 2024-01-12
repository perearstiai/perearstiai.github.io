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

var audioRecordStartTime;

const getCookieValue = (name) => (
    document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)')?.pop() || ''
)

window.onload = function () {
    let APIkey = getCookieValue("APIkey");
    if (APIkey) {
        console.log("API key " + APIkey);
        setAPIKey(APIkey);
    }
};

var audioRecorder = {
    /** Stores the recorded audio as Blob objects of audio data as the recording continues*/
    audioBlobs: [], /*of type Blob[]*/
    /** Stores the reference of the MediaRecorder instance that handles the MediaStream when recording starts*/
    mediaRecorder: null, /*of type MediaRecorder*/
    /** Stores the reference to the stream currently capturing the audio*/
    streamBeingCaptured: null, /*of type MediaStream*/
    /** Start recording the audio
      * @returns {Promise} - returns a promise that resolves if audio recording successfully started
      */
    start: function () {
        //Feature Detection
        if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
            //Feature is not supported in browser
            //return a custom error
            return Promise.reject(new Error('mediaDevices API or getUserMedia method is not supported in this browser.'));
        }
        else {
            //Feature is supported in browser

            //create an audio stream
            return navigator.mediaDevices.getUserMedia({ audio: true }/*of type MediaStreamConstraints*/)
                //returns a promise that resolves to the audio stream
                .then(stream /*of type MediaStream*/ => {

                    //save the reference of the stream to be able to stop it when necessary
                    audioRecorder.streamBeingCaptured = stream;

                    //create a media recorder instance by passing that stream into the MediaRecorder constructor
                    audioRecorder.mediaRecorder = new MediaRecorder(stream); /*the MediaRecorder interface of the MediaStream Recording
                        API provides functionality to easily record media*/

                    //clear previously saved audio Blobs, if any
                    audioRecorder.audioBlobs = [];

                    //add a dataavailable event listener in order to store the audio data Blobs when recording
                    audioRecorder.mediaRecorder.addEventListener("dataavailable", event => {
                        //store audio Blob object
                        audioRecorder.audioBlobs.push(event.data);
                    });

                    //start the recording by calling the start method on the media recorder
                    audioRecorder.mediaRecorder.start();
                });

            /* errors are not handled in the API because if its handled and the promise is chained, the .then after the catch will be executed*/
        }
    },

    /** Stop the started audio recording
     * @returns {Promise} - returns a promise that resolves to the audio as a blob file
     */
    stop: function () {
        //return a promise that would return the blob or URL of the recording
        return new Promise(resolve => {
            //save audio type to pass to set the Blob type
            let mimeType = audioRecorder.mediaRecorder.mimeType;

            //listen to the stop event in order to create & return a single Blob object
            audioRecorder.mediaRecorder.addEventListener("stop", () => {
                //create a single blob object, as we might have gathered a few Blob objects that needs to be joined as one
                let audioBlob = new Blob(audioRecorder.audioBlobs, { type: mimeType });

                //resolve promise with the single audio blob representing the recorded audio
                resolve(audioBlob);
            });

            //stop the recording feature
            audioRecorder.mediaRecorder.stop();

            //stop all the tracks on the active stream in order to stop the stream
            audioRecorder.stopStream();

            //reset API properties for next recording
            audioRecorder.resetRecordingProperties();

        });
    },
    /** Stop all the tracks on the active stream in order to stop the stream and remove
     * the red flashing dot showing in the tab
     */
    stopStream: function () {
        //stopping the capturing request by stopping all the tracks on the active stream
        audioRecorder.streamBeingCaptured.getTracks() //get all tracks from the stream
            .forEach(track /*of type MediaStreamTrack*/ => track.stop()); //stop each one
    },
    /** Reset all the recording properties including the media recorder and stream being captured*/
    resetRecordingProperties: function () {
        audioRecorder.mediaRecorder = null;
        audioRecorder.streamBeingCaptured = null;

    },
    /**Download the recorded audio */

}

startAudioRecording = () => {
    //start recording using the audio recording API
    audioRecorder.start()
        .then(() => { //on success
            console.log("Recording Audio...")
        })
        .catch(error => { //on error
            //No Browser Support Error
            if (error.message.includes("mediaDevices API or getUserMedia method is not supported in this browser.")) {
                console.log("To record audio, use browsers like Chrome and Firefox.");
            }
        });
}

stopAudioRecording = () => {
    //stop the recording using the audio recording API
    console.log("Stopping Audio Recording...")
    audioRecorder.stop()
        .then(audioAsblob => { //stopping makes promise resolves to the blob file of the recorded audio
            console.log("stopped with audio Blob:", audioAsblob);
            let audioFileName = "recording_" + getFormattedTime() + ".webm"
            let audioAsfile = new File([audioAsblob], audioFileName);

            let dt = new DataTransfer();
            dt.items.add(audioAsfile);
            recordedFile.files = dt.files;

            let a = document.createElement('a');
            recordedAudio.src = URL.createObjectURL(audioAsblob);
            a.href = recordedAudio.src
            a.download = audioFileName;
            a.click();
        })
        .catch(error => {
            //Error handling structure
            switch (error.name) {
                case 'InvalidStateError': //error from the MediaRecorder.stop
                    console.log("An InvalidStateError has occured.");
                    break;
                default:
                    console.log("An error occured with the error name " + error.name);
            };

        });
}


/** Computes the elapsedTime since the moment the function is called in the format mm:ss or hh:mm:ss*/
computeElapsedTime = (startTime) => {
    //record end time
    let endTime = new Date();

    //time difference in ms
    let timeDiff = endTime - startTime;

    //convert time difference from ms to seconds
    timeDiff = timeDiff / 1000;

    //extract integer seconds that dont form a minute using %
    let seconds = Math.floor(timeDiff % 60); //ignoring uncomplete seconds (floor)

    //pad seconds with a zero if neccessary
    seconds = seconds < 10 ? "0" + seconds : seconds;

    //convert time difference from seconds to minutes using %
    timeDiff = Math.floor(timeDiff / 60);

    //extract integer minutes that don't form an hour using %
    let minutes = timeDiff % 60; //no need to floor possible incomplete minutes, becase they've been handled as seconds
    minutes = minutes < 10 ? "0" + minutes : minutes;

    //convert time difference from minutes to hours
    timeDiff = Math.floor(timeDiff / 60);

    //extract integer hours that don't form a day using %
    let hours = timeDiff % 24; //no need to floor possible incomplete hours, becase they've been handled as seconds

    //convert time difference from hours to days
    timeDiff = Math.floor(timeDiff / 24);

    // the rest of timeDiff is number of days
    let days = timeDiff; //add days to hours

    let totalHours = hours + (days * 24);
    totalHours = totalHours < 10 ? "0" + totalHours : totalHours;

    if (totalHours === "00") {
        return minutes + ":" + seconds;
    } else {
        return totalHours + ":" + minutes + ":" + seconds;
    }
}

getFormattedTime = () => {
    let today = new Date();
    let y = today.getFullYear().toString().slice(2);
    let m = today.getMonth() + 1;
    m = m < 10 ? "0" + m : m.toString();
    let d = today.getDate();
    d = d < 10 ? "0" + d : d.toString();
    let h = today.getHours()
    h = h < 10 ? "0" + h : h.toString();
    let mi = today.getMinutes()
    mi = mi < 10 ? "0" + mi : mi.toString();
    return y + m + d + "_" + h + mi;
}

setAPIKey = (key) => {
    fetch('/set_key', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ key: key })
    })
        .then(response => response.json())
        .then(data => {
            console.log(data);
        });
}

recordedFile.addEventListener('change', () => {
    // Check if file is audio
    const correct_types = ['audio', 'video'];
    if (!correct_types.includes(recordedFile.files[0].type.split('/')[0])) {
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
        body: JSON.stringify({ content: content, keywords: keywordsBox.value })
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
    document.cookie = "APIkey=" + key;
    setAPIKey(key);
});


recordButton.addEventListener('click', () => {
    if (!isRecording) {
        // Start recording
        startAudioRecording();
        startTime = new Date();

        // Start updating the timer every second
        intervalId = setInterval(() => {
            let elapsedTime = computeElapsedTime(startTime);
            //display the elapsed time
            timer.textContent = elapsedTime;
        }, 1000);

        // Change button color to red
        recordButton.style.backgroundColor = "red";
        recordButton.textContent = "Stop Recording";
        isRecording = true;

    } else {
        // Stop the recording
        stopAudioRecording();
        // Stop updating the timer
        clearInterval(intervalId);
        // Change button color back to initial color
        timer.textContent = "00:00";
        recordButton.style.backgroundColor = "";
        recordButton.textContent = "Start Recording";
        isRecording = false;

    }
});

