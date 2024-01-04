from openai import OpenAI
import json

client = OpenAI()


def speech_recognition(audio_file_name):
    audio_file = open(audio_file_name, "rb")

    transcription = client.audio.transcriptions.create(
        model="whisper-1", file=audio_file, response_format="text"
    )

    return transcription


def abstract_summary_extraction(transcription):
    response = client.chat.completions.create(
        model="gpt-4-1106-preview",
        temperature=0,
        messages=[
            {
                "role": "system",
                "content": "You are a highly skilled AI trained in language comprehension and summarization. \
                    I would like you to read the following text and summarize it into a concise abstract paragraph. \
                        Aim to retain the most important points, providing a coherent and readable summary that could help a \
                            person understand the main points of the discussion without needing to read the entire text. \
                                Please write the summary in Estonian and avoid unnecessary details or tangential points.",
            },
            {"role": "user", "content": transcription},
        ],
    )
    return response.choices[0].message.content


audio_file_name = "recordings/Rail_Baltic_podcast.mp3"
audio_file = open(audio_file_name, "rb")

transcription = client.audio.transcriptions.create(
    model="whisper-1", file=audio_file, response_format="text"
)


with open("text.txt", "w") as f:
    f.write(transcription)

summary = abstract_summary_extraction(transcription)

with open("summary.txt", "w") as f:
    f.write(summary)

print(summary)
