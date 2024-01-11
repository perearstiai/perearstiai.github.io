# Record.py
import threading
import pyaudio
import time
import wave
import os


class Recorder:
    def __init__(self, timer=None, is_web=False) -> None:
        self.rec_time = timer
        self.recording = False
        self.frames = []
        self.start_time = None
        self.is_web = is_web

    def start(self) -> None:
        self.recording = True
        self.frames = []
        threading.Thread(target=self.record).start()
        self.start_time = time.time()

    def stop(self) -> str:
        self.recording = False
        self.stream.stop_stream()
        self.stream.close()
        self.audio.terminate()
        return self.save()

    def record(self) -> None:
        self.audio = pyaudio.PyAudio()
        self.stream = self.audio.open(format=pyaudio.paInt16, channels=1,
                                      rate=44100, input=True, frames_per_buffer=1024)
        while self.recording:
            data = self.stream.read(1024)
            self.frames.append(data)
            if self.rec_time is not None:
                self.rec_time.setText(self.get_time())

    def save(self) -> str:
        # Make recording directory if it doesn't exist
        if not os.path.exists("recordings"):
            os.mkdir("recordings")
        rec_nr = len(os.listdir("recordings")) + 1

        # Save recording
        if self.is_web:
            file_name = f"recordings/recording.wav"
        else:
            file_name = f"recordings/recording{rec_nr}.wav"
        wf = wave.open(file_name, "wb")
        wf.setnchannels(1)
        wf.setsampwidth(self.audio.get_sample_size(pyaudio.paInt16))
        wf.setframerate(44100)
        wf.writeframes(b"".join(self.frames))
        wf.close()
        return file_name

    def get_time(self) -> str:
        passed_time = time.time() - self.start_time
        secs = int(passed_time % 60)
        mins = int(passed_time // 60)
        hours = int(passed_time // 3600)
        return f"{hours:02d}:{mins:02d}:{secs:02d}"
