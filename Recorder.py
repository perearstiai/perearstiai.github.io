# Record.py
import threading
import pyaudio
import time
import wave
import os


class Recorder:
    def __init__(self, timer) -> None:
        self.rec_time = timer
        self.recording = False
        self.frames = []
        self.start_time = None

    def start(self) -> None:
        self.recording = True
        self.frames = []
        threading.Thread(target=self.record).start()
        self.start_time = time.time()

    def stop(self) -> None:
        self.recording = False
        self.stream.stop_stream()
        self.stream.close()
        self.audio.terminate()
        self.save()

    def record(self) -> None:
        self.audio = pyaudio.PyAudio()
        self.stream = self.audio.open(format=pyaudio.paInt16, channels=1,
                                      rate=44100, input=True, frames_per_buffer=1024)
        while self.recording:
            data = self.stream.read(1024)
            self.frames.append(data)
            self.rec_time.setText(self.get_time())

    def save(self) -> None:
        # Make recording directory if it doesn't exist
        if not os.path.exists("recordings"):
            os.mkdir("recordings")
        rec_nr = len(os.listdir("recordings")) + 1

        # Save recording
        wf = wave.open(f"recordings/recording{rec_nr}.wav", "wb")
        wf.setnchannels(1)
        wf.setsampwidth(self.audio.get_sample_size(pyaudio.paInt16))
        wf.setframerate(44100)
        wf.writeframes(b"".join(self.frames))
        wf.close()

    def get_time(self) -> str:
        passed_time = time.time() - self.start_time
        secs = int(passed_time % 60)
        mins = int(passed_time // 60)
        hours = int(passed_time // 3600)
        return f"{hours:02d}:{mins:02d}:{secs:02d}"
