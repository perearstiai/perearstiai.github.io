export function setupFooterLinks() {
  [
    { btn: 'aboutBtn', modal: 'aboutModal' },
    { btn: 'attributionsBtn', modal: 'attributionsModal' },
    { btn: 'privacyPolicyBtn', modal: 'privacyPolicyModal' }
  ].forEach(({ btn, modal }) => {
    const button = document.getElementById(btn);
    const dialog = document.getElementById(modal);
    if (button && dialog) {
      button.addEventListener('click', () => dialog.showModal());
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) dialog.close();
      });
    }
  });
}