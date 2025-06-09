const SETTINGS_KEYS = {
  apiKey: 'openai_api_key',
  examples: 'openai_examples',
  systemPrompt: 'openai_system_prompt',
  lang: 'lang',
  transcribeModel: 'transcribe_model'
};

const DEFAULT_SYSTEM_PROMPT = `You are a medical transcriber specializing in structured clinical notes. 
 
I will provide an AI-generated transcription of a doctor-patient encounter. Since AI may misinterpret medical terms, medications, and dosages, your task is to: 
 
Correct obvious transcription errors for clinical accuracy. 
Adjust misrecognized medical terms based on context. 
Verify whether a medication name actually exists and correct it if necessary. 
Ensure that dosages and forms (e.g., mg, mcg, tablets, injections) are reasonable based on standard medical guidelines. 
Keep the note concise and structured while preserving all relevant details. 
If the patient’s family history is mentioned, include it. 
Format the clinical note in Estonian, following these sections (only include applicable ones): 
 
Anamnees (Reason for visit, key symptoms, relevant history, smoking/alcohol use) 
Füüsiline läbivaatus (Findings observed during the visit) 
Plaan ja soovitused (Treatment, investigations, referrals, verified medications with corrected dosages)

User can also provide examples of correct clinical notes to help you understand the expected format and content. Examples, if provided, can be seen below.\n`;

export function getSettings() {
  // Remove [Examples begin] and [Examples end] from the examples field for UI
  let wrappedExamples = localStorage.getItem(SETTINGS_KEYS.examples) || '';
  let examples = wrappedExamples.replace(/^\[Examples begin\]\n?/m, '').replace(/\n?\[Examples end\]$/m, '');
  return {
    apiKey: localStorage.getItem(SETTINGS_KEYS.apiKey) || '',
    examples: examples,
    wrappedExamples: wrappedExamples,
    systemPrompt: localStorage.getItem(SETTINGS_KEYS.systemPrompt) || DEFAULT_SYSTEM_PROMPT,
    lang: localStorage.getItem(SETTINGS_KEYS.lang) || 'est',
    transcribeModel: localStorage.getItem(SETTINGS_KEYS.transcribeModel)
  };
}
export function saveSettings({ apiKey, examples, systemPrompt, lang, transcribeModel }) {
  localStorage.setItem(SETTINGS_KEYS.apiKey, apiKey);
  const wrappedExamples = `[Examples begin]\n${examples ? examples.trim() : ''}\n[Examples end]`;
  localStorage.setItem(SETTINGS_KEYS.examples, wrappedExamples);
  localStorage.setItem(SETTINGS_KEYS.systemPrompt, systemPrompt);
  if (lang) localStorage.setItem(SETTINGS_KEYS.lang, lang);
  if (transcribeModel) localStorage.setItem(SETTINGS_KEYS.transcribeModel, transcribeModel);
}
export function getOpenAIKey() {
  return getSettings().apiKey;
}
export function getExamples() {
  return getSettings().examples;
}
export function getWrappedExamples() {
  return getSettings().wrappedExamples;
}
export function getSystemPrompt() {
  return getSettings().systemPrompt;
}
export function getLang() {
  return getSettings().lang;
}
export function getTranscribeModel() {
  return getSettings().transcribeModel;
}
export function setTranscribeModel(model) {
  localStorage.setItem(SETTINGS_KEYS.transcribeModel, model);
}
export async function requireLang() {
  let lang = localStorage.getItem(SETTINGS_KEYS.lang);
  if (!lang) {
    lang = 'est'; // Default to Estonian if not set
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
  let closeBtn = document.getElementById('closeSettingsBtn');
  const apiKeyInput = document.getElementById('settingsApiKey');
  const examplesInput = document.getElementById('settingsExamples');
  const systemPromptInput = document.getElementById('settingsSystemPrompt');
  const langHiddenInput = document.getElementById('settingsLang');
  const customDropdown = document.getElementById('customLangDropdown');
  const customDropdownOptions = document.getElementById('customLangOptions');
  const customDropdownSelected = document.getElementById('customLangSelected');
  const apikeyShow = document.getElementById('settings-apikey-show');
  const apikeyHide = document.getElementById('settings-apikey-hide');

  let originalLang = getLang();
  let firstOpen = false;

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

  // Remove close button from DOM
  function removeCloseBtn() {
    const btn = document.getElementById('closeSettingsBtn');
    if (btn && btn.parentNode) btn.parentNode.removeChild(btn);
    closeBtn = null;
  }

  // Restore close button to DOM if missing
  function ensureCloseBtn() {
    removeCloseBtn(); // Always remove any existing button first
    const actions = settingsForm.querySelector('.modal-actions');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'closeSettingsBtn';
    btn.setAttribute('data-i18n', 'settings_close');
    btn.textContent = getLocaleText('settings_close');
    btn.className = '';
    btn.addEventListener('click', async () => {
      if (!btn.disabled) settingsModal.close();
      // If language was changed but not applied, revert UI language
      if (langHiddenInput.value !== originalLang) {
        await loadAndApplyTranslations(originalLang); // revert to value at open
        langHiddenInput.value = originalLang;
        if (customDropdownOptions && customDropdownSelected) {
          customDropdownOptions.querySelectorAll('.custom-dropdown-option').forEach(opt => {
            if (opt.getAttribute('data-value') === originalLang) {
              opt.classList.add('selected');
              customDropdownSelected.textContent = opt.textContent;
            } else {
              opt.classList.remove('selected');
            }
          });
        }
        // Do NOT update originalLang here; it should remain as at open
      }
      settingsModal.close();
    });
    actions.appendChild(btn);
    closeBtn = btn;
  }

  // Open modal
  settingsBtn.addEventListener('click', () => openModal(false));

  // Modal open logic
  function openModal(force) {
    const s = getSettings();
    apiKeyInput.value = s.apiKey;
    examplesInput.value = s.examples;
    systemPromptInput.value = s.systemPrompt || DEFAULT_SYSTEM_PROMPT;
    // Always sync lang from storage on open
    const langFromStorage = getLang();
    langHiddenInput.value = langFromStorage;
    originalLang = langFromStorage;
    // Set custom dropdown to current language
    if (customDropdown && customDropdownOptions && customDropdownSelected) {
      customDropdownOptions.querySelectorAll('.custom-dropdown-option').forEach(opt => {
        if (opt.getAttribute('data-value') === langFromStorage) {
          opt.classList.add('selected');
          customDropdownSelected.textContent = opt.textContent;
        } else {
          opt.classList.remove('selected');
        }
      });
    }
    settingsModal.showModal();
    validate();
    if (force) {
      firstOpen = true;
      removeCloseBtn();
    } else {
      firstOpen = false;
      ensureCloseBtn();
    }
    if (window.setupUniversalExpandButtons) {
      window.setupUniversalExpandButtons();
    }
  }

  // Validate
  function validate() {
    const apiKey = apiKeyInput.value.trim();
    const systemPrompt = systemPromptInput.value.trim();
    const errorText = document.getElementById('settingsErrorText');
    let showError = false;
    let errorMsg = '';
    if (!apiKey || !systemPrompt) {
      showError = true;
      errorMsg = getLocaleText('settings_required_error') || 'All required fields must be specified!';
    }
    applyBtn.disabled = !(apiKey && systemPrompt);
    if (showError) {
      errorText.textContent = errorMsg;
      errorText.style.display = 'block';
    } else {
      errorText.textContent = '';
      errorText.style.display = 'none';
    }
  }
  settingsForm.addEventListener('input', validate);
  onTranslationsUpdated(validate);

  // Save/apply
  settingsForm.addEventListener('submit', e => {
    e.preventDefault();
    if (applyBtn.disabled) return;
    saveSettings({
      apiKey: apiKeyInput.value.trim(),
      examples: examplesInput.value.trim(),
      systemPrompt: systemPromptInput.value.trim(),
      lang: langHiddenInput.value
    });
    if (firstOpen) {
      ensureCloseBtn();
      firstOpen = false;
    }
    settingsModal.close();
  });

  // --- Dropdown Keyboard Accessibility Helper ---
  function setupDropdownKeyboardAccessibility(dropdown, optionsList, onSelect) {
    dropdown.addEventListener('keydown', async (e) => {
      const options = Array.from(optionsList.querySelectorAll('.custom-dropdown-option'));
      const currentIdx = options.findIndex(opt => opt.classList.contains('selected'));
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        let nextIdx = (currentIdx + 1) % options.length;
        await onSelect(options[nextIdx]);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        let prevIdx = (currentIdx - 1 + options.length) % options.length;
        await onSelect(options[prevIdx]);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        dropdown.classList.toggle('open');
      } else if (e.key === 'Escape') {
        dropdown.classList.remove('open');
      }
    });
  }

  // Custom Dropdown Logic (Language)
  if (customDropdown && customDropdownOptions && customDropdownSelected) {
    customDropdown.addEventListener('mousedown', (e) => {
      if (!e.target.classList.contains('custom-dropdown-option')) {
        customDropdown.classList.toggle('open');
      }
    });
    async function selectLangOption(option) {
      if (!option) return;
      customDropdownOptions.querySelectorAll('.custom-dropdown-option').forEach(opt => opt.classList.remove('selected'));
      option.classList.add('selected');
      customDropdownSelected.textContent = option.textContent;
      const langValue = option.getAttribute('data-value');
      langHiddenInput.value = langValue;
      customDropdown.classList.remove('open');
      await loadAndApplyTranslations(langValue);
    }
    customDropdownOptions.addEventListener('mousedown', async (e) => {
      const option = e.target.closest('.custom-dropdown-option');
      if (option && customDropdownOptions.contains(option)) {
        await selectLangOption(option);
      }
    });
    document.addEventListener('mousedown', (e) => {
      if (customDropdown.classList.contains('open') && !customDropdown.contains(e.target)) {
        customDropdown.classList.remove('open');
      }
    });
    setupDropdownKeyboardAccessibility(customDropdown, customDropdownOptions, selectLangOption);
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

// Utility: get all progress messages from all loaded locales
export async function getAllProgressMessages() {
  // List of locale files
  const localeFiles = ['eng', 'est'];
  const keys = [
    'cancelling',
    'transcribing_wait',
    'summarizing_wait'
  ];
  const messages = new Set();
  for (const locale of localeFiles) {
    try {
      const res = await fetch(`assets/locales/${locale}.json`);
      const data = await res.json();
      for (const key of keys) {
        if (data[key]) messages.add(data[key]);
      }
    } catch (e) {}
  }
  // Add hardcoded English/Estonian fallbacks
  ['Cancelling...', 'Transcribing...', 'Summarizing...', 'Katkestan...', 'Transkribeerin...', 'Loon kokkuvõtet...'].forEach(m => messages.add(m));
  return Array.from(messages);
}