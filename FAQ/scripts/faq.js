// Simple accessible accordion for FAQ items
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const items = document.querySelectorAll('.faq-item');
    items.forEach((item, idx) => {
      const btn = item.querySelector('.faq-question');
      const panel = item.querySelector('.faq-answer');
      if (!btn || !panel) return;

      const panelId = panel.id || `faq-panel-${idx}`;
      panel.id = panelId;
      btn.setAttribute('aria-controls', panelId);
      btn.setAttribute('aria-expanded', 'false');
      panel.setAttribute('role', 'region');
      panel.setAttribute('aria-hidden', 'true');

      btn.addEventListener('click', () => {
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        
        // close all others (optional: behave like accordion)
        items.forEach(other => {
          const oBtn = other.querySelector('.faq-question');
          const oPanel = other.querySelector('.faq-answer');
          if (!oBtn || !oPanel) return;
          oBtn.setAttribute('aria-expanded', 'false');
          oPanel.setAttribute('aria-hidden', 'true');
          other.classList.remove('open');
          oPanel.style.maxHeight = '0px';
        });

        if (!expanded) {
          btn.setAttribute('aria-expanded', 'true');
          panel.setAttribute('aria-hidden', 'false');
          item.classList.add('open');
          // Force a reflow to ensure maxHeight is calculated correctly
          panel.style.maxHeight = '0px';
          setTimeout(() => {
            panel.style.maxHeight = panel.scrollHeight + 'px';
          }, 10);
        }
      });
    });
  });
})();

