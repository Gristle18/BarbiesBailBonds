// Basic upload logic & drag-and-drop helper
// Endpoint is configured via scripts/config.js as window.UPLOAD_ENDPOINT

(function () {
  // Initialize when DOM is loaded
  document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM loaded, initializing upload functionality...');
    console.log('🔧 Upload endpoint configured:', window.UPLOAD_ENDPOINT || 'NOT SET');
    
    // Initialize dropzones for both forms
    initializeAllDropzones();
    
    // Initialize form functionality
    initializeForm('En'); // English form
    initializeForm('Es'); // Spanish form
    
    console.log('✅ Upload functionality initialization complete');
  });

  function initializeAllDropzones() {
    // Find all dropzones in the document
    const dropzones = document.querySelectorAll('.dropzone');
    console.log('📂 Found dropzones:', dropzones.length);
    
    dropzones.forEach((zone, index) => {
      const targetId = zone.getAttribute('data-target');
      const input = document.getElementById(targetId);
      const list = document.getElementById(targetId + 'List');
      
      console.log(`📁 Dropzone ${index + 1}:`, {
        targetId: targetId,
        hasInput: !!input,
        hasList: !!list,
        inputType: input?.type,
        acceptedTypes: input?.accept
      });
      
      if (!input || !list) {
        console.warn('⚠️ Missing elements for dropzone:', targetId);
        return;
      }

      const updateList = (files) => {
        console.log(`📋 Updating file list for ${targetId}:`, files?.length || 0, 'files');
        if (!files || files.length === 0) { 
          list.textContent = ''; 
          return; 
        }
        const fileDetails = Array.from(files).map(f => {
          console.log(`📄 File: ${f.name}, Size: ${(f.size/1024/1024).toFixed(2)} MB, Type: ${f.type}`);
          return `${f.name} · ${(f.size/1024/1024).toFixed(2)} MB`;
        });
        list.innerHTML = fileDetails.join('<br>');
      };

      // Click to upload
      zone.addEventListener('click', (e) => {
        console.log('🖱️ Dropzone clicked for:', targetId);
        e.preventDefault();
        input.click();
      });

      // Drag and drop
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('dragover');
      });

      zone.addEventListener('dragleave', (e) => {
        // Only remove dragover if we're really leaving the dropzone
        if (!zone.contains(e.relatedTarget)) {
          zone.classList.remove('dragover');
        }
      });

      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        console.log(`🎯 Files dropped on ${targetId}:`, files.length, 'files');
        
        // Log each dropped file
        Array.from(files).forEach((file, i) => {
          console.log(`  📎 Dropped file ${i + 1}: ${file.name} (${file.type}, ${(file.size/1024/1024).toFixed(2)} MB)`);
        });
        
        if (input.multiple) {
          console.log(`✅ Setting ${files.length} files to multi-file input ${targetId}`);
          input.files = files;
        } else {
          console.log(`✅ Setting first file to single-file input ${targetId}`);
          // For single input, take the first file
          const dt = new DataTransfer();
          if (files[0]) {
            dt.items.add(files[0]);
          }
          input.files = dt.files;
        }
        updateList(input.files);
      });

      // File input change
      input.addEventListener('change', () => {
        console.log(`📁 File input changed for ${targetId}: ${input.files.length} files selected`);
        Array.from(input.files).forEach((file, i) => {
          console.log(`  📄 Selected file ${i + 1}: ${file.name} (${file.type}, ${(file.size/1024/1024).toFixed(2)} MB)`);
        });
        updateList(input.files);
      });
    });
  }

  function initializeForm(suffix) {
    console.log(`🏗️ Initializing form for language: ${suffix === 'Es' ? 'Spanish' : 'English'}`);
    
    const form = document.getElementById('uploadForm' + suffix);
    const resetBtn = document.getElementById('resetBtn' + suffix);
    const submitBtn = document.getElementById('submitBtn' + suffix);
    const successMsg = document.getElementById('successMsg' + suffix);
    const errorMsg = document.getElementById('errorMsg' + suffix);

    console.log(`📋 Form elements found:`, {
      form: !!form,
      submitBtn: !!submitBtn,
      resetBtn: !!resetBtn,
      successMsg: !!successMsg,
      errorMsg: !!errorMsg
    });

    if (!form) {
      console.error('❌ Form not found for suffix:', suffix);
      return;
    }

    console.log('✅ Successfully found form:', 'uploadForm' + suffix);

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
      console.log(`🚀 Form submission started for ${suffix === 'Es' ? 'Spanish' : 'English'} form`);
      e.preventDefault();
      successMsg.style.display = 'none';
      errorMsg.style.display = 'none';

      // Basic required checks
      console.log('🔍 Validating required fields...');
      const requiredIds = ['yourName' + suffix, 'yourPhone' + suffix, 'idFront' + suffix];
      for (const id of requiredIds) {
        const el = document.getElementById(id);
        const isValid = el && (el.type === 'file' ? el.files.length > 0 : el.value.trim());
        console.log(`  📝 ${id}: ${isValid ? '✅ Valid' : '❌ Missing/Empty'}`);
        
        if (!isValid) {
          console.error(`❌ Validation failed for required field: ${id}`);
          el?.reportValidity?.();
          return;
        }
      }
      console.log('✅ All required fields validated successfully');

      // Size/type checks (<=10MB per file)
      console.log('🔍 Validating file sizes and types...');
      const okTypes = ['image/jpeg','image/png','image/webp','image/heic','application/pdf'];
      const fileInputs = ['idFront' + suffix, 'idBack' + suffix, 'docs' + suffix];
      let totalFiles = 0;
      let totalSize = 0;
      
      for (const id of fileInputs) {
        const input = document.getElementById(id);
        if (!input || !input.files || input.files.length === 0) {
          console.log(`  📁 ${id}: No files`);
          continue;
        }
        
        console.log(`  📁 ${id}: ${input.files.length} files`);
        for (const f of input.files) {
          totalFiles++;
          totalSize += f.size;
          const fileSizeMB = (f.size/1024/1024).toFixed(2);
          
          console.log(`    📄 File: ${f.name}`);
          console.log(`       Size: ${fileSizeMB} MB`);
          console.log(`       Type: ${f.type}`);
          
          if (f.size > 10 * 1024 * 1024) { // 10MB
            console.error(`❌ File too large: ${f.name} (${fileSizeMB} MB > 10 MB)`);
            errorMsg.textContent = suffix === 'Es' 
              ? `Archivo demasiado grande: ${f.name} (máximo 10MB)`
              : `File too large: ${f.name} (max 10MB)`;
            errorMsg.style.display = 'block';
            return;
          }
          if (!okTypes.includes(f.type)) {
            console.error(`❌ Unsupported file type: ${f.name} (${f.type})`);
            errorMsg.textContent = suffix === 'Es'
              ? `Tipo no soportado: ${f.name}`
              : `Unsupported type: ${f.name}`;
            errorMsg.style.display = 'block';
            return;
          }
        }
      }
      
      console.log(`✅ File validation passed: ${totalFiles} files, ${(totalSize/1024/1024).toFixed(2)} MB total`);

      // If not configured, show fallback and exit
      console.log('🔗 Checking upload endpoint configuration...');
      const endpoint = (typeof window !== 'undefined' && window.UPLOAD_ENDPOINT) ? window.UPLOAD_ENDPOINT : '';
      console.log(`  🎯 Endpoint: ${endpoint || 'NOT CONFIGURED'}`);
      
      if (!endpoint) {
        console.warn('⚠️ Upload endpoint not configured, showing fallback message');
        errorMsg.textContent = suffix === 'Es'
          ? 'Carga aún no configurada. Por favor envíe sus fotos por texto a 561-247-0018.'
          : 'Upload not configured yet. Please text your photos to 561-247-0018.';
        errorMsg.style.display = 'block';
        return;
      }
      console.log('✅ Endpoint configured, proceeding with upload');

      console.log('📦 Building FormData for submission...');
      submitBtn.disabled = true;
      try {
        const fd = new FormData();
        
        // Add form fields
        const yourName = document.getElementById('yourName' + suffix).value;
        const yourPhone = document.getElementById('yourPhone' + suffix).value;
        const defendantName = document.getElementById('defendantName' + suffix).value || '';
        const caseNumber = document.getElementById('caseNumber' + suffix).value || '';
        const language = suffix === 'Es' ? 'spanish' : 'english';
        const timestamp = new Date().toISOString();
        
        fd.append('yourName', yourName);
        fd.append('yourPhone', yourPhone);
        fd.append('defendantName', defendantName);
        fd.append('caseNumber', caseNumber);
        fd.append('language', language);
        fd.append('timestamp', timestamp);
        
        console.log('📋 Form data:');
        console.log(`  👤 Name: ${yourName}`);
        console.log(`  📞 Phone: ${yourPhone}`);
        console.log(`  🏷️ Defendant: ${defendantName || 'N/A'}`);
        console.log(`  📋 Case #: ${caseNumber || 'N/A'}`);
        console.log(`  🌐 Language: ${language}`);
        console.log(`  ⏰ Timestamp: ${timestamp}`);
        
        // Add files
        let fileCount = 0;
        if (document.getElementById('idFront' + suffix).files[0]) {
          const file = document.getElementById('idFront' + suffix).files[0];
          fd.append('idFront', file);
          console.log(`  📄 ID Front: ${file.name} (${(file.size/1024/1024).toFixed(2)} MB)`);
          fileCount++;
        }
        if (document.getElementById('idBack' + suffix).files[0]) {
          const file = document.getElementById('idBack' + suffix).files[0];
          fd.append('idBack', file);
          console.log(`  📄 ID Back: ${file.name} (${(file.size/1024/1024).toFixed(2)} MB)`);
          fileCount++;
        }
        const docs = document.getElementById('docs' + suffix).files;
        if (docs && docs.length) {
          console.log(`  📁 Additional docs: ${docs.length} files`);
          Array.from(docs).forEach((f, i) => {
            fd.append('docs[]', f, f.name);
            console.log(`    📄 Doc ${i + 1}: ${f.name} (${(f.size/1024/1024).toFixed(2)} MB)`);
            fileCount++;
          });
        }
        
        console.log(`✅ FormData built successfully: ${fileCount} files total`);

        console.log('🌐 Sending request to:', endpoint);
        console.log('📤 Request details:');
        console.log('  Method: POST');
        console.log('  Mode: no-cors');
        console.log('  Body: FormData with', fileCount, 'files');
        
        const startTime = Date.now();
        
        const response = await fetch(endpoint, {
          method: 'POST',
          body: fd,
          mode: 'no-cors' // Apps Script web apps typically need no-cors
        });
        
        const endTime = Date.now();
        console.log(`⏱️ Request completed in ${endTime - startTime}ms`);
        console.log('📥 Response received:');
        console.log('  Status:', response.status);
        console.log('  StatusText:', response.statusText);
        console.log('  Headers:', Object.fromEntries(response.headers.entries()));
        
        // Note: no-cors mode means we can't read response body
        console.log('💡 Note: Response body not accessible due to no-cors mode');

        console.log('✅ Upload completed successfully');
        successMsg.style.display = 'block';
        form.reset();
        form.querySelectorAll('.file-list').forEach(el => el.textContent = '');
      } catch (err) {
        console.error('❌ Upload error occurred:', err);
        console.error('Error details:', {
          name: err.name,
          message: err.message,
          stack: err.stack
        });
        
        errorMsg.textContent = suffix === 'Es'
          ? 'Hubo un problema al subir. Por favor envíe sus fotos por texto a 561-247-0018.'
          : 'There was a problem uploading. Please text your photos to 561-247-0018.';
        errorMsg.style.display = 'block';
      } finally {
        console.log('🏁 Upload process finished, re-enabling submit button');
        submitBtn.disabled = false;
      }
    });
  }
})();