// Utility for copy-to-clipboard, expand button, textarea loading
import { getLocaleText, onTranslationsUpdated } from '../components/settings.js';

export function setupCopyButton({ btnId, iconId, tooltipId, textareaId }) {
  const btn = document.getElementById(btnId);
  const icon = document.getElementById(iconId);
  const tooltip = document.getElementById(tooltipId);
  const textarea = document.getElementById(textareaId);
  if (!btn || !icon || !tooltip || !textarea) return;
  const COPY_ICON_SRC = 'assets/img/copy-icon.svg';
  const TICK_ICON_SRC = 'assets/img/copy-success.svg';
  let blurTimeout = null;
  function syncCopyBtnDisabled() { btn.disabled = textarea.disabled; }
  syncCopyBtnDisabled();
  const observer = new MutationObserver(syncCopyBtnDisabled);
  observer.observe(textarea, { attributes: true, attributeFilter: ['disabled'] });
  btn.addEventListener('click', async () => {
    if (!textarea || btn.disabled) return;
    try {
      await navigator.clipboard.writeText(textarea.value);
      btn.classList.add('copied');
      icon.src = TICK_ICON_SRC;
      tooltip.textContent = getLocaleText('copied');
      clearTimeout(blurTimeout);
      blurTimeout = setTimeout(() => {
        btn.classList.remove('copied');
        icon.src = COPY_ICON_SRC;
        tooltip.textContent = getLocaleText('copy');
        btn.blur();
      }, 1000);
    } catch {
      tooltip.textContent = getLocaleText('copy_error') || 'Copy failed';
    }
  });
  function resetCopyBtn() {
    if (!btn.classList.contains('copied')) {
      icon.src = COPY_ICON_SRC;
      tooltip.textContent = getLocaleText('copy');
      clearTimeout(blurTimeout);
    }
  }
  btn.addEventListener('mouseleave', resetCopyBtn);
  btn.addEventListener('blur', resetCopyBtn);
  btn.addEventListener('mouseenter', () => {
    if (!btn.classList.contains('copied')) tooltip.textContent = getLocaleText('copy');
  });
  btn.addEventListener('focus', () => {
    if (!btn.classList.contains('copied')) tooltip.textContent = getLocaleText('copy');
  });
  onTranslationsUpdated(() => {
    if (btn.classList.contains('copied')) tooltip.textContent = getLocaleText('copied');
    else tooltip.textContent = getLocaleText('copy');
  });
}

export function setupUniversalExpandButtons() {
  document.querySelectorAll('textarea').forEach((textarea, idx) => {
    let wrapper = textarea.closest('.copy-textarea-wrapper') || textarea.closest('.textarea-expand-wrapper');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.className = 'textarea-expand-wrapper';
      textarea.parentNode.insertBefore(wrapper, textarea);
      wrapper.appendChild(textarea);
    }
    const oldBtn = wrapper.querySelector('.expand-arrow-btn');
    if (oldBtn) oldBtn.remove();
    // Always reset expanded state when (re)initializing
    textarea._expanded = false;
    addExpandBtn(textarea, idx, wrapper);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function addExpandBtn(textarea, idx, wrapper) {
  const btnId = `expandBtn_${idx}`;
  const tooltipId = `expandTooltip_${idx}`;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'expand-arrow-btn';
  btn.id = btnId;
  btn.setAttribute('aria-label', getLocaleText('expand') || 'Expand');
  btn.style.display = 'none';
  const arrow = document.createElement('span');
  arrow.className = 'expand-arrow';
  arrow.innerHTML = '&#x25BC;';
  const tooltip = document.createElement('span');
  tooltip.className = 'expand-tooltip';
  tooltip.id = tooltipId;
  tooltip.setAttribute('data-i18n', 'expand');
  tooltip.textContent = getLocaleText('expand') || 'Expand';
  btn.appendChild(arrow);
  btn.appendChild(tooltip);
  wrapper.appendChild(btn);
  if (typeof textarea._expanded === 'undefined') textarea._expanded = false;
  function updateUI() {
    if (textarea._expanded) {
      btn.classList.add('expanded');
      textarea.classList.add('expanded-textarea');
      arrow.style.transform = 'rotate(180deg)';
      tooltip.textContent = getLocaleText('collapse');
      btn.setAttribute('aria-label', getLocaleText('collapse'));
      textarea.style.resize = 'none';
      textarea.style.height = textarea.scrollHeight + 2 + 'px';
      textarea.style.maxHeight = window.innerHeight * 1.8 + 'px';
    } else {
      btn.classList.remove('expanded');
      textarea.classList.remove('expanded-textarea');
      arrow.style.transform = '';
      tooltip.textContent = getLocaleText('expand');
      btn.setAttribute('aria-label', getLocaleText('expand'));
      textarea.style.height = '';
      textarea.style.maxHeight = '';
      textarea.style.resize = '';
    }
  }
  function checkExpandNeeded() {
    textarea.style.height = '';
    if (textarea.disabled) {
      if (textarea._expanded) {
        textarea._expanded = false;
        updateUI();
      }
      btn.style.display = 'none';
      return;
    }
    if (textarea.scrollHeight > textarea.clientHeight + 2) {
      btn.style.display = '';
    } else {
      btn.style.display = 'none';
    }
  }
  btn.addEventListener('click', () => {
    textarea._expanded = !textarea._expanded;
    updateUI();
  });
  onTranslationsUpdated(() => { updateUI(); });
  btn.addEventListener('mouseenter', () => {
    tooltip.textContent = textarea._expanded ? getLocaleText('collapse') : getLocaleText('expand');
    tooltip.style.opacity = 1;
  });
  btn.addEventListener('focus', () => {
    tooltip.textContent = textarea._expanded ? getLocaleText('collapse') : getLocaleText('expand');
    tooltip.style.opacity = 1;
  });
  btn.addEventListener('mouseleave', () => { tooltip.style.opacity = 0; });
  btn.addEventListener('blur', () => { tooltip.style.opacity = 0; });
  textarea.addEventListener('input', () => {
    if (textarea._expanded) textarea.style.height = textarea.scrollHeight + 2 + 'px';
    checkExpandNeeded();
  });
  checkExpandNeeded();
  window.addEventListener('resize', checkExpandNeeded);
  updateUI();
  const copyBtn = wrapper.querySelector('.copy-btn');
  function syncButtonDisabled() {
    btn.disabled = textarea.disabled;
    if (textarea.disabled) {
      if (textarea._expanded) {
        textarea._expanded = false;
        updateUI();
      }
      btn.style.display = 'none';
    } else {
      checkExpandNeeded();
    }
    if (copyBtn) copyBtn.disabled = textarea.disabled;
  }
  syncButtonDisabled();
  const observer = new MutationObserver(syncButtonDisabled);
  observer.observe(textarea, { attributes: true, attributeFilter: ['disabled'] });
}

export function setTextareaLoadingState(textarea, isLoading) {
  if (!textarea) return;
  textarea.classList.toggle('textarea-loading', isLoading);
  textarea.disabled = isLoading;
}

// General UI setup for copy/expand/textarea loading
export function setupGlobalTextAreaUI() {
  setupCopyButton({
    btnId: 'copyTranscriptionBtn',
    iconId: 'copyTranscriptionIcon',
    tooltipId: 'copyTranscriptionTooltip',
    textareaId: 'transcriptionBox'
  });
  setupCopyButton({
    btnId: 'copySummaryBtn',
    iconId: 'copySummaryIcon',
    tooltipId: 'copySummaryTooltip',
    textareaId: 'summaryBox'
  });
  setupUniversalExpandButtons();
  // Patch for legacy code that expects these on window
  window.setTextareaLoadingState = setTextareaLoadingState;
  window.setupUniversalExpandButtons = setupUniversalExpandButtons;
}
