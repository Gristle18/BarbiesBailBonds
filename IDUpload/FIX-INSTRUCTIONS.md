# How to Fix IDUpload

## The Problem
Google Apps Script cannot receive file uploads via multipart/form-data. The current index.html tries to send actual file bytes which fail.

## The Solution
Convert files to base64 strings and send as JSON, exactly like bail-bond-application does.

## Step 1: Add Helper Functions

Add this right after the opening `<script>` tag in index.html (around line 935):

```javascript
/**
 * Convert file to base64 string (like bail-bond-application approach)
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
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
```

## Step 2: Replace the Upload Logic

Find this line (around line 2558):
```javascript
// Submit to Google Apps Script with debugging
try {
  console.log('🚀 Starting upload process...');
```

Replace EVERYTHING from that line down to around line 2850 (the end of the try-catch block) with:

```javascript
// Submit to Google Apps Script with debugging
try {
  console.log('🚀 Starting upload process (FIXED - JSON with base64)...');
  
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = suffix === 'Es' ? 'Enviando...' : 'Submitting...';
  }

  // Show progress message
  errorMsg.textContent = suffix === 'Es' ? 'Convirtiendo archivos...' : 'Converting files...';
  errorMsg.style.display = 'block';
  errorMsg.style.background = '#2196F3';

  // Create JSON object (like bail-bond-application does)
  const jsonData = {
    timestamp: new Date().toISOString(),
    yourName: document.getElementById('yourName' + suffix)?.value || '',
    yourPhone: document.getElementById('yourPhone' + suffix)?.value || '',
    defendantName: document.getElementById('defendantName' + suffix)?.value || '',
    caseNumber: document.getElementById('caseNumber' + suffix)?.value || '',
    language: suffix === 'Es' ? 'spanish' : 'english',
    documentSections: []
  };

  console.log('📋 Form data:', jsonData);

  // Process document sections and convert files to base64
  const documentSections = form.querySelectorAll('.dynamic-doc-section');
  console.log(`Found ${documentSections.length} document sections`);
  
  let totalFiles = 0;
  
  for (let index = 0; index < documentSections.length; index++) {
    const section = documentSections[index];
    
    // Get document type
    const docTypeSelect = section.querySelector(`select[id*="documentType"]`);
    const docType = docTypeSelect ? docTypeSelect.value : 'Other';
    
    console.log(`Processing section ${index}: ${docType}`);
    
    const sectionData = {
      documentType: docType,
      files: []
    };
    
    // Find all file inputs in this section
    const fileInputs = section.querySelectorAll('input[type="file"]');
    
    for (const input of fileInputs) {
      if (input.files && input.files.length > 0) {
        for (const file of input.files) {
          console.log(`Converting ${file.name} to base64...`);
          
          errorMsg.textContent = suffix === 'Es' 
            ? `Procesando: ${file.name}...`
            : `Processing: ${file.name}...`;
          
          try {
            const fileData = await fileToBase64(file);
            sectionData.files.push(fileData);
            totalFiles++;
            console.log(`Converted ${file.name} (${(file.size/1024).toFixed(2)} KB)`);
          } catch (err) {
            console.error(`Failed to convert ${file.name}:`, err);
          }
        }
      }
    }
    
    if (sectionData.files.length > 0) {
      jsonData.documentSections.push(sectionData);
    }
  }
  
  console.log(`Total files converted: ${totalFiles}`);
  
  if (totalFiles === 0) {
    throw new Error(suffix === 'Es' 
      ? 'No se encontraron archivos para cargar'
      : 'No files found to upload');
  }
  
  // Update progress
  errorMsg.textContent = suffix === 'Es' 
    ? 'Enviando al servidor...'
    : 'Sending to server...';
  
  // Google Apps Script URL
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw9DvZFje5f_ssDVNh7eXaARwbK0VdCCzJct6iw22K10PRJMVkGnhVHjVBv3dvfmqvk/exec';
  
  console.log('Sending JSON data to Google Apps Script...');
  
  // Send as JSON exactly like bail-bond-application does
  const response = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors', // Same as bail-bond-application
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(jsonData)
  });
  
  // With no-cors, we can't read response
  console.log('Upload request sent successfully');
  
  // Show success
  errorMsg.style.display = 'none';
  successMsg.style.display = 'block';
  successMsg.textContent = suffix === 'Es'
    ? '¡Documentos enviados exitosamente!'
    : 'Documents uploaded successfully!';
  
  // Reset form
  form.reset();
  form.querySelectorAll('.file-list').forEach(el => el.textContent = '');
  
  // Clear dynamic sections
  const dynamicContainer = document.getElementById('dynamicDocumentSections' + suffix);
  if (dynamicContainer) {
    dynamicContainer.innerHTML = '';
  }
  
} catch (error) {
  console.error('Upload error:', error);
  
  errorMsg.style.display = 'block';
  errorMsg.style.background = '';
  errorMsg.textContent = suffix === 'Es'
    ? `Error: ${error.message}. Por favor envíe sus fotos por texto a 561-247-0018.`
    : `Error: ${error.message}. Please text your photos to 561-247-0018.`;
  
} finally {
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = suffix === 'Es' ? 'Enviar Documentos' : 'Submit Documents';
  }
}
```

## Step 3: Update Google Apps Script

Replace the code in your Google Apps Script project with the contents of `document-upload-fixed.gs`

## Step 4: Deploy

1. In Google Apps Script, click Deploy > New Deployment
2. Choose "Web app" as the type
3. Set "Execute as: Me" and "Who has access: Anyone"
4. Deploy and copy the new URL
5. Update the APPS_SCRIPT_URL in index.html with your new URL

## That's it!

The form will now:
1. Convert files to base64 strings on the client
2. Send everything as JSON (not multipart)
3. Google Apps Script will decode the base64 and save real files to Drive

This is exactly how bail-bond-application works successfully.