// Basic upload logic & drag-and-drop helper
// Endpoint is configured via scripts/config.js as window.UPLOAD_ENDPOINT

(function () {
  // Initialize both forms when DOM is loaded
  document.addEventListener('DOMContentLoaded', function() {
    initializeForm('En'); // English form
    initializeForm('Es'); // Spanish form
  });

  function initializeForm(suffix) {
    const form = document.getElementById('uploadForm' + suffix);
    const resetBtn = document.getElementById('resetBtn' + suffix);
    const submitBtn = document.getElementById('submitBtn' + suffix);
    const successMsg = document.getElementById('successMsg' + suffix);
    const errorMsg = document.getElementById('errorMsg' + suffix);

    if (!form) return; // Form doesn't exist yet

    // Attach click to dropzones to proxy file input
    form.querySelectorAll('.dropzone').forEach(zone => {
      const targetId = zone.getAttribute('data-target');
      const input = document.getElementById(targetId);
      const list = document.getElementById(targetId + 'List');
      if (!input || !list) return;

      const updateList = (files) => {
        if (!files || files.length === 0) { list.textContent = ''; return; }
        list.innerHTML = Array.from(files).map(f => `${f.name} · ${(f.size/1024/1024).toFixed(2)} MB`).join('<br>');
      };

      zone.addEventListener('click', () => input.click());
      zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        if (input.multiple) {
          input.files = e.dataTransfer.files;
        } else {
          // For single input, take the first file
          const dt = new DataTransfer();
          if (e.dataTransfer.files[0]) dt.items.add(e.dataTransfer.files[0]);
          input.files = dt.files;
        }
        updateList(input.files);
      });
      input.addEventListener('change', () => updateList(input.files));
    });

    // Simple phone formatting on blur (USA)
    const phone = document.getElementById('yourPhone' + suffix);
    if (phone) {
      phone.addEventListener('blur', () => {
        const digits = (phone.value || '').replace(/[^0-9]/g, '');
        if (digits.length === 10) {
          phone.value = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        }
      });
    }

    // Reset behavior
    resetBtn?.addEventListener('click', () => {
      form.reset();
      form.querySelectorAll('.file-list').forEach(el => el.textContent = '');
      successMsg.style.display = 'none';
      errorMsg.style.display = 'none';
    });

    // Submit handler
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      successMsg.style.display = 'none';
      errorMsg.style.display = 'none';

      // Basic required checks
      const requiredIds = ['yourName' + suffix, 'yourPhone' + suffix, 'idFront' + suffix];
      for (const id of requiredIds) {
        const el = document.getElementById(id);
        if (!el || (el.type === 'file' ? el.files.length === 0 : !el.value)) {
          el?.reportValidity?.();
          return;
        }
      }

      // Size/type checks (<=10MB per file)
      const okTypes = ['image/jpeg','image/png','image/webp','image/heic','application/pdf'];
      const fileInputs = ['idFront' + suffix, 'idBack' + suffix, 'docs' + suffix];
      for (const id of fileInputs) {
        const input = document.getElementById(id);
        if (!input || !input.files) continue;
        for (const f of input.files) {
          if (f.size > 10 * 1024 * 1024) { // 10MB
            errorMsg.textContent = suffix === 'Es' 
              ? `Archivo demasiado grande: ${f.name} (máximo 10MB)`
              : `File too large: ${f.name} (max 10MB)`;
            errorMsg.style.display = 'block';
            return;
          }
          if (!okTypes.includes(f.type)) {
            errorMsg.textContent = suffix === 'Es'
              ? `Tipo no soportado: ${f.name}`
              : `Unsupported type: ${f.name}`;
            errorMsg.style.display = 'block';
            return;
          }
        }
      }

      // If not configured, show fallback and exit
      const endpoint = (typeof window !== 'undefined' && window.UPLOAD_ENDPOINT) ? window.UPLOAD_ENDPOINT : '';
      if (!endpoint) {
        errorMsg.textContent = suffix === 'Es'
          ? 'Carga aún no configurada. Por favor envíe sus fotos por texto a 561-247-0018.'
          : 'Upload not configured yet. Please text your photos to 561-247-0018.';
        errorMsg.style.display = 'block';
        return;
      }

      submitBtn.disabled = true;
      try {
        const fd = new FormData();
        fd.append('yourName', document.getElementById('yourName' + suffix).value);
        fd.append('yourPhone', document.getElementById('yourPhone' + suffix).value);
        fd.append('defendantName', document.getElementById('defendantName' + suffix).value || '');
        fd.append('caseNumber', document.getElementById('caseNumber' + suffix).value || '');
        fd.append('language', suffix === 'Es' ? 'spanish' : 'english');
        
        if (document.getElementById('idFront' + suffix).files[0]) {
          fd.append('idFront', document.getElementById('idFront' + suffix).files[0]);
        }
        if (document.getElementById('idBack' + suffix).files[0]) {
          fd.append('idBack', document.getElementById('idBack' + suffix).files[0]);
        }
        const docs = document.getElementById('docs' + suffix).files;
        if (docs && docs.length) {
          Array.from(docs).forEach((f, i) => fd.append('docs[]', f, f.name));
        }
        fd.append('timestamp', new Date().toISOString());

        await fetch(endpoint, {
          method: 'POST',
          body: fd,
          mode: 'no-cors' // Apps Script web apps typically need no-cors
        });

        successMsg.style.display = 'block';
        form.reset();
        form.querySelectorAll('.file-list').forEach(el => el.textContent = '');
      } catch (err) {
        console.error('Upload error:', err);
        errorMsg.textContent = suffix === 'Es'
          ? 'Hubo un problema al subir. Por favor envíe sus fotos por texto a 561-247-0018.'
          : 'There was a problem uploading. Please text your photos to 561-247-0018.';
        errorMsg.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
      }
    });
  }
})();