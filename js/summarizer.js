import { getOpenAIKey, getSystemPrompt, getExamples } from './settings.js';

export function setupSummarizer() {
  const summarizeButton = document.getElementById('summarizeButton');
  const transcriptionBox = document.getElementById('transcriptionBox');
  const summaryBox = document.getElementById('summaryBox');

  summarizeButton.addEventListener('click', async () => {
    const apiKey = getOpenAIKey().trim();
    const content = transcriptionBox.value.trim();
    const examples = getExamples().trim();
    let systemPrompt = getSystemPrompt().trim();

    if (!apiKey) {
      alert('Please enter your OpenAI API key in settings.');
      return;
    }
    if (!content) {
      alert('Please provide text to summarize.');
      return;
    }

    summaryBox.value = 'Summarizing...';

    try {
      // Inject examples into system prompt if provided
      if (examples) {
        systemPrompt += `\n\nHere are some examples for context:\n${examples}`;
      }

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