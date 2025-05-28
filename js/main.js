import { setupRecorder } from './components/recorder.js';
import { setupTranscriber } from './components/transcriber.js';
import { setupSummarizer } from './components/summarizer.js';
import { setupSettingsModal, requireSettings, requireLang } from './components/settings.js';
import { setupFooterLinks } from './components/footer-links.js';
import { setupGlobalTextAreaUI } from './helpers/ui-utils.js';
import { setupSectionDisabling } from './helpers/section-disabling.js';

window.addEventListener('DOMContentLoaded', async () => {
  // Hide loading overlay only after all setup is done
  const hideLoadingOverlay = () => {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.add('hidden');
    setTimeout(() => {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 400); // allow transition
  };

  await requireLang();
  setupSettingsModal();
  requireSettings().then(() => {
    setupRecorder();
    setupTranscriber();
    setupSummarizer();
    setupFooterLinks();
    setupGlobalTextAreaUI();
    setupSectionDisabling();
    hideLoadingOverlay();
  });
});