from openai import OpenAI


class Summarizer:
    def __init__(self, model, temperature) -> None:
        self.client = OpenAI(api_key='')
        self.model = model
        self.temperature = temperature

    def summarize(self, content, keywords) -> str:
        if keywords.strip() != "":
            keyword_sentence = (
                f"The summarization must contain the following keywords: {keywords}."
            )
        else:
            keyword_sentence = ""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                temperature=self.temperature,
                messages=[
                    {
                        "role": "system",
                        "content": f"You are a highly skilled AI trained in language comprehension and summarization of medical transcripts. \
                                I would like you to read the following text and summarize it into a concise abstract paragraph. \
                                {keyword_sentence}\
                                Aim to retain the most important points, providing a coherent and readable summary that could help a \
                                person understand the main points of the discussion without needing to read the entire text. \
                                You should focus only on the medical aspects of the discussion and ignore the rest. \
                                Please write the summary in Estonian and avoid unnecessary details or tangential points.",
                    },
                    {"role": "user", "content": content},
                ],
            )
        except Exception as e:
            return str(e)
        return response.choices[0].message.content

    def set_key(self, key) -> None:
        self.client.api_key = key
