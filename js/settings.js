const SETTINGS_KEYS = {
  apiKey: 'openai_api_key',
  examples: 'openai_examples',
  systemPrompt: 'openai_system_prompt',
  lang: 'lang'
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
    lang: localStorage.getItem(SETTINGS_KEYS.lang) || 'eng'
  };
}
export function saveSettings({ apiKey, examples, systemPrompt, lang }) {
  localStorage.setItem(SETTINGS_KEYS.apiKey, apiKey);
  localStorage.setItem(SETTINGS_KEYS.examples, examples || '');
  localStorage.setItem(SETTINGS_KEYS.systemPrompt, systemPrompt);
  if (lang) localStorage.setItem(SETTINGS_KEYS.lang, lang);
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
export function getLang() {
  return getSettings().lang;
}
export async function requireLang() {
  let lang = localStorage.getItem(SETTINGS_KEYS.lang);
  if (!lang) {
    lang = 'eng';
    localStorage.setItem(SETTINGS_KEYS.lang, lang);
  }
  await loadAndApplyTranslations(lang);
}

const translationEmitter = new EventTarget(); // Translation emitter for dynamic text updates
let translations = {};
export async function loadAndApplyTranslations(lang) {
  const res = await fetch(`assets/locales/${lang}.json`);
  translations = await res.json();
  // Text content
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[key]) el.textContent = translations[key];
  });
  // Placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (translations[key]) el.placeholder = translations[key];
  });
  translationEmitter.dispatchEvent(new Event('translations-updated'));
}
export function onTranslationsUpdated(callback) {
  translationEmitter.addEventListener('translations-updated', callback);
}

export function getLocaleText(key) {
  return translations[key] || key;
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
  const langSelect = document.getElementById('settingsLang');
  const apikeyShow = document.getElementById('settings-apikey-show');
  const apikeyHide = document.getElementById('settings-apikey-hide');

  let originalLang = getLang();

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
  closeBtn.addEventListener('click', async () => {
    if (!closeBtn.disabled) settingsModal.close();
    // If language was changed but not applied, revert UI language
    if (langSelect.value !== originalLang) {
        await loadAndApplyTranslations(originalLang);
        langSelect.value = originalLang;
    }
      settingsModal.close();
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
      systemPrompt: systemPromptInput.value.trim(),
      lang: langSelect.value
    });
    settingsModal.close();
  });

  // Modal open logic
  function openModal(force) {
    const s = getSettings();
    apiKeyInput.value = s.apiKey;
    examplesInput.value = s.examples;
    systemPromptInput.value = s.systemPrompt || DEFAULT_SYSTEM_PROMPT;
    langSelect.value = s.lang || 'eng';
    originalLang = langSelect.value;
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

  // Language change in modal
  langSelect.addEventListener('change', async () => {
    await loadAndApplyTranslations(langSelect.value);
  });

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