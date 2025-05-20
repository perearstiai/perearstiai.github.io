// Sets up summarization logic and UI event listeners
export function setupSummarizer() {
  const summarizeButton = document.getElementById('summarizeButton');
  const transcriptionBox = document.getElementById('transcriptionBox');
  const keywordsBox = document.getElementById('keywordsBox');
  const summaryBox = document.getElementById('summaryBox');
  const keyInput = document.getElementById('keyInput');

  summarizeButton.addEventListener('click', async () => {
    const apiKey = keyInput.value.trim();
    const content = transcriptionBox.value.trim();
    const keywords = keywordsBox.value.trim();

    if (!apiKey) {
      alert('Please enter your OpenAI API key.');
      return;
    }
    if (!content) {
      alert('Please provide text to summarize.');
      return;
    }

    summaryBox.value = 'Summarizing...';

    try {
      // Compose the system prompt, optionally including keywords
      let systemPrompt = `You are a highly skilled AI trained in language comprehension and summarization of medical transcripts. 
I would like you to read the following text and summarize it into three concise abstract paragraphs. 
The first paragraph should contain information about patients' health condition, symptoms and what remedies has the patient already used. 
The second paragraph should contain information about the physicians' observations and findings about the patients' condition. 
The third paragraph should contain information about physicians' agreement with the patient and further instructions and referrals. `;
      if (keywords) {
        systemPrompt += `The summarization must contain the following keywords: ${keywords}. If there is no context about the word, say "Tekstis ei leidunud viiteid antud märksõnadele: [keywords list]". `;
      }
      systemPrompt += `Aim to retain the most important points, providing a coherent and readable summary that could help a person understand the main points of the discussion without needing to read the entire text. 
You should focus only on the medical aspects of the discussion and ignore the rest. 
Please write the summary in Estonian and avoid unnecessary details or tangential points.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4-1106-preview",
          temperature: 0,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: content }
          ]
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Summarization failed');
      }

      const data = await response.json();
      summaryBox.value = data.choices?.[0]?.message?.content || '[No summary returned]';
    } catch (err) {
      summaryBox.value = 'Summarization failed: ' + err.message;
    }
  });
}