import io
from openai import OpenAI
from pydub import AudioSegment


class WhisperAPI:
    def __init__(self, model) -> None:
        self.client = OpenAI(api_key='')
        self.model = model
        self.response_format = "text"

    def transcribe(self, audio_file, path=True) -> str:
        af = open(audio_file, "rb")
        try:
            transcription = self.client.audio.transcriptions.create(
                model=self.model, file=af, response_format=self.response_format
            )
        except Exception as e:
            return str(e)

        af.close()

        return transcription

    def set_key(self, key) -> None:
        self.client.api_key = key
