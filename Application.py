from PyQt6.QtWidgets import *
from PyQt6 import uic
from Recorder import Recorder


class Application(QMainWindow):
    recording: bool = False
    audio_file: str = None
    transcript_file: str = None

    def __init__(self) -> None:
        super().__init__()
        uic.loadUi("app.ui", self)
        self.show()

        # Create an instance of Recorder
        self.recorder = Recorder(self.rec_time)

        self.record_btn.clicked.connect(self.record_clicked)
        self.transcribe_btn.clicked.connect(self.transcribe)
        self.summarize_btn.clicked.connect(self.summarize)

        self.select_audio.clicked.connect(
            lambda: self.browse_file(self.select_audio))
        self.select_transcript.clicked.connect(
            lambda: self.browse_file(self.select_transcript))

    def record_clicked(self) -> None:
        if self.recorder.recording:
            self.record_btn.setText("Record")
            self.record_btn.setStyleSheet("")
            self.recorder.stop()
        else:
            self.record_btn.setText("Recording")
            self.record_btn.setStyleSheet("background-color: red")
            self.recorder.start()

    def transcribe(self) -> None:
        if self.audio_file is None:
            print("No audio file selected")
            return
        print("Transcribing...")
        # TODO: Transcribe
        pass

    def summarize(self) -> None:
        if self.transcript_file is None:
            print("No transcript file selected")
            return
        print("Summarizing...")
        # TODO: Summarize
        pass

    def browse_file(self, btn) -> None:
        if btn == self.select_audio:
            file = QFileDialog.getOpenFileName(
                self, "Open File", "", "Audio Files (*.wav)")
            self.audio_path.setText(file[0])
            self.audio_file = file[0]
        elif btn == self.select_transcript:
            file = QFileDialog.getOpenFileName(
                self, "Open File", "", "Text Files (*.txt)")
            self.transcript_path.setText(file[0])
            self.transcript_file = file[0]


if __name__ == "__main__":
    app = QApplication([])
    window = Application()
    app.exec()
