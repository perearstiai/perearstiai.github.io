const SETTINGS_KEYS = {
  apiKey: 'openai_api_key',
  examples: 'openai_examples',
  systemPrompt: 'openai_system_prompt'
};
const DEFAULT_SYSTEM_PROMPT = `You are a highly skilled AI trained in language comprehension and summarization of medical transcripts.
I would like you to read the following text and summarize it into three concise abstract paragraphs.
The first paragraph should contain information about patients' health condition, symptoms and what remedies has the patient already used.
The second paragraph should contain information about the physicians' observations and findings about the patients' condition.
The third paragraph should contain information about physicians' agreement with the patient and further instructions and referrals.
Aim to retain the most important points, providing a coherent and readable summary that could help a person understand the main points of the discussion without needing to read the entire text.
You should focus only on the medical aspects of the discussion and ignore the rest.
Please write the summary in Estonian and avoid unnecessary details or tangential points.`;

export function getSettings() {
  return {
    apiKey: localStorage.getItem(SETTINGS_KEYS.apiKey) || '',
    examples: localStorage.getItem(SETTINGS_KEYS.examples) || '',
    systemPrompt: localStorage.getItem(SETTINGS_KEYS.systemPrompt) || DEFAULT_SYSTEM_PROMPT,
  };
}
export function saveSettings({ apiKey, examples, systemPrompt }) {
  localStorage.setItem(SETTINGS_KEYS.apiKey, apiKey);
  localStorage.setItem(SETTINGS_KEYS.examples, examples || '');
  localStorage.setItem(SETTINGS_KEYS.systemPrompt, systemPrompt);
}
export function getOpenAIKey() {
  return getSettings().apiKey;
}
export function getExamples() {
  return getSettings().examples;
}
export function getSystemPrompt() {
  return getSettings().systemPrompt;
}

// Modal logic
export function setupSettingsModal() {
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const settingsForm = document.getElementById('settingsForm');
  const applyBtn = document.getElementById('applySettingsBtn');
  const closeBtn = document.getElementById('closeSettingsBtn');
  const apiKeyInput = document.getElementById('settingsApiKey');
  const examplesInput = document.getElementById('settingsExamples');
  const systemPromptInput = document.getElementById('settingsSystemPrompt');
  const apikeyShow = document.getElementById('settings-apikey-show');
  const apikeyHide = document.getElementById('settings-apikey-hide');

  // Eye toggle
  apikeyShow.style.display = '';
  apikeyHide.style.display = 'none';
  apikeyShow.addEventListener('click', () => {
    apiKeyInput.type = 'text';
    apikeyShow.style.display = 'none';
    apikeyHide.style.display = '';
    apiKeyInput.focus();
  });
  apikeyHide.addEventListener('click', () => {
    apiKeyInput.type = 'password';
    apikeyShow.style.display = '';
    apikeyHide.style.display = 'none';
    apiKeyInput.focus();
  });

  // Open modal
  settingsBtn.addEventListener('click', () => openModal(false));
  closeBtn.addEventListener('click', () => {
    if (!closeBtn.disabled) settingsModal.close();
  });

  // Validate
  function validate() {
    const apiKey = apiKeyInput.value.trim();
    const systemPrompt = systemPromptInput.value.trim();
    applyBtn.disabled = !(apiKey && systemPrompt);
  }
  settingsForm.addEventListener('input', validate);

  // Save/apply
  settingsForm.addEventListener('submit', e => {
    e.preventDefault();
    if (applyBtn.disabled) return;
    saveSettings({
      apiKey: apiKeyInput.value.trim(),
      examples: examplesInput.value.trim(),
      systemPrompt: systemPromptInput.value.trim()
    });
    settingsModal.close();
  });

  // Modal open logic
  function openModal(force) {
    const s = getSettings();
    apiKeyInput.value = s.apiKey;
    examplesInput.value = s.examples;
    systemPromptInput.value = s.systemPrompt || DEFAULT_SYSTEM_PROMPT;
    settingsModal.showModal();
    validate();
    if (force) {
      closeBtn.disabled = true;
      closeBtn.style.opacity = 0.5;
    } else {
      closeBtn.disabled = false;
      closeBtn.style.opacity = 1;
    }
  }

  // Expose for requireSettings
  window._openSettingsModal = openModal;
}

// Require settings before proceeding
export function requireSettings() {
  return new Promise(resolve => {
    const s = getSettings();
    if (!s.apiKey || !s.systemPrompt) {
      window._openSettingsModal(true);
      const settingsModal = document.getElementById('settingsModal');
      settingsModal.addEventListener('close', check, { once: false });
      function check() {
        const s2 = getSettings();
        if (s2.apiKey && s2.systemPrompt) {
          resolve();
        } else {
          window._openSettingsModal(true);
        }
      }
    } else {
      resolve();
    }
  });
}