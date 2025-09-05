// FAQ Accordion and Search functionality
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const items = document.querySelectorAll('.faq-item');
    const searchInput = document.getElementById('faqSearch');
    const searchInfo = document.getElementById('searchInfo');
    const noResults = document.getElementById('noResults');
    
    // Store original content for search highlighting
    const originalContent = [];
    
    // Initialize accordion functionality
    items.forEach((item, idx) => {
      const btn = item.querySelector('.faq-question');
      const panel = item.querySelector('.faq-answer');
      if (!btn || !panel) return;

      // Store original content
      const questionText = btn.textContent.replace('▶', '').trim();
      const answerText = panel.textContent.trim();
      originalContent.push({
        element: item,
        question: questionText,
        answer: answerText,
        questionBtn: btn,
        answerPanel: panel
      });

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

    // Search functionality
    function highlightText(text, searchTerm) {
      if (!searchTerm) return text;
      const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return text.replace(regex, '<span class="highlight">$1</span>');
    }

    function searchFAQ() {
      const searchTerm = searchInput.value.toLowerCase().trim();
      let visibleCount = 0;
      
      // Close all expanded items when searching
      items.forEach(item => {
        const btn = item.querySelector('.faq-question');
        const panel = item.querySelector('.faq-answer');
        if (btn && panel) {
          btn.setAttribute('aria-expanded', 'false');
          panel.setAttribute('aria-hidden', 'true');
          item.classList.remove('open');
          panel.style.maxHeight = '0px';
        }
      });

      originalContent.forEach(({ element, question, answer, questionBtn, answerPanel }) => {
        const questionMatch = question.toLowerCase().includes(searchTerm);
        const answerMatch = answer.toLowerCase().includes(searchTerm);
        
        if (!searchTerm || questionMatch || answerMatch) {
          element.classList.remove('hidden');
          visibleCount++;
          
          // Restore or highlight content
          if (searchTerm) {
            // Update question text with highlighting (preserve chevron)
            const chevron = questionBtn.querySelector('.chevron');
            questionBtn.innerHTML = '';
            questionBtn.appendChild(chevron);
            const questionSpan = document.createElement('span');
            questionSpan.innerHTML = highlightText(question, searchTerm);
            questionBtn.appendChild(document.createTextNode(' '));
            questionBtn.appendChild(questionSpan);
            
            // Update answer text with highlighting
            const answerInner = answerPanel.querySelector('.answer-inner p');
            if (answerInner) {
              answerInner.innerHTML = highlightText(answer, searchTerm);
            }
          } else {
            // Restore original content
            const chevron = questionBtn.querySelector('.chevron');
            questionBtn.innerHTML = '';
            questionBtn.appendChild(chevron);
            questionBtn.appendChild(document.createTextNode(' ' + question));
            
            const answerInner = answerPanel.querySelector('.answer-inner p');
            if (answerInner) {
              answerInner.textContent = answer;
            }
          }
        } else {
          element.classList.add('hidden');
        }
      });

      // Update search info and show/hide no results
      if (searchTerm) {
        if (visibleCount === 0) {
          searchInfo.textContent = 'No results found';
          noResults.style.display = 'block';
        } else {
          searchInfo.textContent = `Showing ${visibleCount} result${visibleCount !== 1 ? 's' : ''} for "${searchTerm}"`;
          noResults.style.display = 'none';
        }
      } else {
        searchInfo.textContent = `Showing all ${visibleCount} questions`;
        noResults.style.display = 'none';
      }
    }

    // Add search event listeners
    if (searchInput) {
      searchInput.addEventListener('input', searchFAQ);
      searchInput.addEventListener('keyup', searchFAQ);
      
      // Initial search info
      searchInfo.textContent = `Showing all ${originalContent.length} questions`;
    }
  });
})();

