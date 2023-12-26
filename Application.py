from PyQt6.QtWidgets import *
from PyQt6 import uic
import pyaudio
import threading
import os
import time
import wave


class Application(QMainWindow):
    recording: bool = False
    audio_file: str = None
    transcript_file: str = None

    def __init__(self) -> None:
        super().__init__()
        uic.loadUi("app.ui", self)
        self.show()

        self.record_btn.clicked.connect(self.record_clicked)
        self.transcribe_btn.clicked.connect(self.transcribe)
        self.summarize_btn.clicked.connect(self.summarize)
        
        self.select_audio.clicked.connect(lambda: self.browse_file(self.select_audio))
        self.select_transcript.clicked.connect(lambda: self.browse_file(self.select_transcript))

    def record_clicked(self) -> None:
        if self.recording:
            self.record_btn.setText("Record")
            self.record_btn.setStyleSheet("")
        else:
            self.record_btn.setText("Recording")
            self.record_btn.setStyleSheet("background-color: red")
            threading.Thread(target=self.record).start()
        self.recording = not self.recording
        
    def transcribe(self, file) -> None:
        if self.audio_file is None:
            print("No audio file selected")
            return
        print("Transcribing...")      
        # TODO: Transcribe  
        pass
    
    def summarize(self, file) -> None:
        if self.transcript_file is None:
            print("No transcript file selected")
            return
        print("Summarizing...")
        # TODO: Summarize
        pass
    
    def browse_file(self, btn) -> None:
        if btn == self.select_audio:
            file = QFileDialog.getOpenFileName(self, "Open File", "", "Audio Files (*.wav)")
            self.audio_path.setText(file[0])
            self.audio_file = file[0]
        elif btn == self.select_transcript:
            file = QFileDialog.getOpenFileName(self, "Open File", "", "Text Files (*.txt)")
            self.transcript_path.setText(file[0])
            self.transcript_file = file[0]

    def record(self) -> None:
        audio = pyaudio.PyAudio()
        stream = audio.open(format=pyaudio.paInt16, channels=1,
                            rate=44100, input=True, frames_per_buffer=1024)
        frames = []
        start_time = time.time()

        while self.recording:
            data = stream.read(1024)
            frames.append(data)

            passed_time = time.time() - start_time
            secs = int(passed_time % 60)
            mins = int(passed_time // 60)
            hours = int(passed_time // 3600)

            self.rec_time.setText(f"{hours:02d}:{mins:02d}:{secs:02d}")

        stream.stop_stream()
        stream.close()
        audio.terminate()

        # Make recording directory if it doesn't exist
        if not os.path.exists("recordings"):
            os.mkdir("recordings")
        rec_nr = len(os.listdir("recordings")) + 1

        # Save recording
        wf = wave.open(f"recordings/recording{rec_nr}.wav", "wb")
        wf.setnchannels(1)
        wf.setsampwidth(audio.get_sample_size(pyaudio.paInt16))
        wf.setframerate(44100)
        wf.writeframes(b"".join(frames))
        wf.close()


if __name__ == "__main__":
    app = QApplication([])
    window = Application()
    app.exec()
