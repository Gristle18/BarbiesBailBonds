/**
 * Fixed upload handler for IDUpload that sends files as base64 JSON
 * Similar to how bail-bond-application works
 */

// Google Apps Script Web App URL
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw9DvZFje5f_ssDVNh7eXaARwbK0VdCCzJct6iw22K10PRJMVkGnhVHjVBv3dvfmqvk/exec';

/**
 * Convert file to base64 string
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Get base64 string without the data URL prefix
      const base64 = reader.result.split(',')[1];
      resolve({
        filename: file.name,
        contentType: file.type,
        size: file.size,
        base64: base64
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Submit form data with files as base64
 */
async function submitUploadAsJSON(formElement, suffix) {
  console.log('🚀 Starting JSON-based upload (like bail-bond-application)');
  
  try {
    // Collect all form data
    const formData = {
      timestamp: new Date().toISOString(),
      yourName: document.getElementById('yourName' + suffix).value,
      yourPhone: document.getElementById('yourPhone' + suffix).value, 
      defendantName: document.getElementById('defendantName' + suffix).value || '',
      caseNumber: document.getElementById('caseNumber' + suffix).value || '',
      language: suffix === 'Es' ? 'spanish' : 'english'
    };
    
    console.log('📋 Form data collected:', formData);
    
    // Process document sections
    const documentSections = [];
    let sectionIndex = 0;
    
    // Find all document sections in the form
    const sections = formElement.querySelectorAll('.document-section');
    console.log(`📁 Found ${sections.length} document sections`);
    
    for (const section of sections) {
      const docTypeSelect = section.querySelector('select[id*="documentType"]');
      const docType = docTypeSelect ? docTypeSelect.value : 'Other';
      
      console.log(`📄 Processing section ${sectionIndex}: ${docType}`);
      
      const sectionData = {
        documentType: docType,
        files: []
      };
      
      // Find file inputs in this section
      const fileInputs = section.querySelectorAll('input[type="file"]');
      
      for (const input of fileInputs) {
        if (input.files && input.files.length > 0) {
          for (const file of input.files) {
            console.log(`  📎 Converting ${file.name} to base64...`);
            try {
              const fileData = await fileToBase64(file);
              sectionData.files.push(fileData);
              console.log(`  ✅ Converted ${file.name} (${(file.size/1024).toFixed(2)} KB)`);
            } catch (err) {
              console.error(`  ❌ Failed to convert ${file.name}:`, err);
            }
          }
        }
      }
      
      if (sectionData.files.length > 0) {
        documentSections.push(sectionData);
      }
      
      sectionIndex++;
    }
    
    // Add document sections to form data
    formData.documentSections = documentSections;
    
    console.log(`📊 Total sections with files: ${documentSections.length}`);
    console.log(`📊 Total files to upload: ${documentSections.reduce((sum, s) => sum + s.files.length, 0)}`);
    
    // Send as JSON like bail-bond-application does
    console.log('📤 Sending JSON data to Google Apps Script...');
    
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors', // Same as bail-bond-application
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData)
    });
    
    // With no-cors, we can't read the response
    console.log('✅ Upload request sent (no-cors mode - response not readable)');
    
    // Show success message
    const successMsg = document.getElementById('successMsg' + suffix);
    if (successMsg) {
      successMsg.style.display = 'block';
      successMsg.textContent = suffix === 'Es' 
        ? '¡Documentos enviados exitosamente!'
        : 'Documents uploaded successfully!';
    }
    
    // Reset form
    formElement.reset();
    formElement.querySelectorAll('.file-list').forEach(el => el.textContent = '');
    
    return true;
    
  } catch (error) {
    console.error('❌ Upload error:', error);
    
    const errorMsg = document.getElementById('errorMsg' + suffix);
    if (errorMsg) {
      errorMsg.style.display = 'block';
      errorMsg.textContent = suffix === 'Es'
        ? 'Error al enviar. Por favor envíe sus fotos por texto a 561-247-0018.'
        : 'Upload failed. Please text your photos to 561-247-0018.';
    }
    
    return false;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Initializing fixed upload handler...');
  
  // Hook into existing form submit for both English and Spanish forms
  ['En', 'Es'].forEach(suffix => {
    const form = document.getElementById('uploadForm' + suffix);
    if (form) {
      // Remove existing submit handler and add our fixed one
      const newForm = form.cloneNode(true);
      form.parentNode.replaceChild(newForm, form);
      
      newForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log(`📝 Form submission intercepted for ${suffix === 'Es' ? 'Spanish' : 'English'} form`);
        
        const submitBtn = document.getElementById('submitBtn' + suffix);
        if (submitBtn) submitBtn.disabled = true;
        
        try {
          await submitUploadAsJSON(newForm, suffix);
        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
      });
      
      console.log(`✅ Fixed handler attached to ${suffix === 'Es' ? 'Spanish' : 'English'} form`);
    }
  });
});