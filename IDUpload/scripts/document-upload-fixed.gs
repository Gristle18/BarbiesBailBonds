/**
 * Fixed Google Apps Script for IDUpload - handles base64 file uploads
 * Based on working bail-bond-application approach
 */

// Configuration - Google Drive folder and spreadsheet IDs
const CONFIG = {
  folders: {
    'Government ID': '1jaAaDP_I9PlcfoIOxOexma4ls7DP9P7b',
    'Proof of Address': '1eSTcKw6v20jagojceU4KGFyVndC8xQqA', 
    'Proof of Employment': '1Cugr4TB6mKsbT62MzEM9t1gtmPgN9I8Y',
    'Other': '1rEWjhQEqhLxBddXd4oHUOiN0EG0Dzx5o'
  },
  
  spreadsheets: {
    'Government ID': '1PGRHMVC1HPJ_pSDWdTlYGkw1HfKl4uowLO8IX7stPcw',
    'Proof of Address': '18PspzNXT6f84izsMOu3QPyn_SPkFGa_k9qntg0tyMug',
    'Proof of Employment': '1JoDbIluaJVmgb8iZ42zw_nj11RKBiFK-JT0j4oTPiiw', 
    'Other': '1WY4Ee4acWO_rxgr5y9l7BFa6_TGGJkgy_70HUDUuUWw'
  }
};

/**
 * Main POST handler - receives JSON data with base64 files
 * Similar to bail-bond-application's approach
 */
function doPost(e) {
  console.log('=== Document Upload Request Received ===');
  console.log('Request timestamp:', new Date().toISOString());
  
  try {
    let formData = null;
    
    // Parse JSON data (like bail-bond-application does)
    if (e.postData && e.postData.contents) {
      console.log('Parsing JSON from postData.contents');
      try {
        formData = JSON.parse(e.postData.contents);
        console.log('Successfully parsed JSON data');
        console.log('Form fields:', Object.keys(formData));
      } catch (jsonError) {
        console.error('JSON parsing failed:', jsonError.toString());
        
        // Fallback to parameters (for form-encoded data)
        if (e.parameter) {
          formData = e.parameter;
        }
      }
    }
    
    // Fallback to parameters if no JSON
    if (!formData && e.parameter) {
      formData = e.parameter;
    }
    
    if (!formData) {
      throw new Error('No form data received');
    }
    
    // Validate required fields
    const requiredFields = ['yourName', 'yourPhone'];
    for (const field of requiredFields) {
      if (!formData[field]) {
        throw new Error(`Required field missing: ${field}`);
      }
    }
    
    console.log('Processing upload for:', formData.yourName);
    console.log('Document sections:', formData.documentSections ? formData.documentSections.length : 0);
    
    const results = [];
    let totalFilesProcessed = 0;
    
    // Process each document section
    if (formData.documentSections && Array.isArray(formData.documentSections)) {
      for (const section of formData.documentSections) {
        const documentType = section.documentType || 'Other';
        console.log(`Processing ${documentType} with ${section.files ? section.files.length : 0} files`);
        
        if (section.files && section.files.length > 0) {
          try {
            const result = processDocumentSection(documentType, formData, section.files);
            results.push(result);
            totalFilesProcessed += section.files.length;
          } catch (error) {
            console.error(`Error processing ${documentType}:`, error.toString());
            results.push({
              documentType: documentType,
              success: false,
              error: error.toString()
            });
          }
        }
      }
    }
    
    // Send email notification
    try {
      sendNotificationEmail(formData, results);
    } catch (emailError) {
      console.warn('Email notification failed:', emailError.toString());
    }
    
    // Return success response (like bail-bond-application)
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Documents uploaded successfully!',
        filesProcessed: totalFilesProcessed,
        results: results
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error processing upload:', error.toString());
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Process a document section with base64 files
 */
function processDocumentSection(documentType, formData, files) {
  const folderId = CONFIG.folders[documentType];
  const spreadsheetId = CONFIG.spreadsheets[documentType];
  
  if (!folderId || !spreadsheetId) {
    throw new Error(`Configuration missing for document type: ${documentType}`);
  }
  
  const folder = DriveApp.getFolderById(folderId);
  const uploadedFiles = [];
  
  // Upload each base64 file to Drive
  for (let i = 0; i < files.length; i++) {
    const fileData = files[i];
    
    try {
      // Create filename with timestamp
      const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
      const safeName = formData.yourName.replace(/[^a-zA-Z0-9]/g, '');
      const extension = getFileExtension(fileData.filename, fileData.contentType);
      const filename = `${safeName}_${documentType}_${timestamp}_${i + 1}${extension}`;
      
      // Decode base64 and create blob
      const blob = Utilities.newBlob(
        Utilities.base64Decode(fileData.base64),
        fileData.contentType,
        filename
      );
      
      // Create file in Drive
      const file = folder.createFile(blob);
      
      uploadedFiles.push({
        name: fileData.filename,
        driveFilename: filename,
        url: file.getUrl(),
        id: file.getId()
      });
      
      console.log(`Uploaded: ${filename}`);
      
    } catch (fileError) {
      console.error(`Error uploading file ${fileData.filename}:`, fileError.toString());
      throw fileError;
    }
  }
  
  // Update spreadsheet
  updateSpreadsheet(spreadsheetId, documentType, formData, uploadedFiles);
  
  return {
    documentType: documentType,
    success: true,
    filesUploaded: uploadedFiles.length,
    files: uploadedFiles
  };
}

/**
 * Get file extension from filename or content type
 */
function getFileExtension(filename, contentType) {
  // Try to get from filename first
  if (filename && filename.includes('.')) {
    return '.' + filename.split('.').pop();
  }
  
  // Fallback to content type
  const typeMap = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/heic': '.heic',
    'application/pdf': '.pdf'
  };
  
  return typeMap[contentType] || '.bin';
}

/**
 * Update spreadsheet with upload record
 */
function updateSpreadsheet(spreadsheetId, documentType, formData, uploadedFiles) {
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getActiveSheet();
  
  // Ensure headers exist
  if (sheet.getLastRow() === 0) {
    const headers = [
      'Timestamp',
      'Name',
      'Phone',
      'Defendant Name',
      'Case Number',
      'File URLs',
      'File Count'
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  
  // Prepare row data
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  const fileUrls = uploadedFiles.map(f => f.url).join('\n');
  
  const rowData = [
    timestamp,
    formData.yourName,
    formData.yourPhone,
    formData.defendantName || '',
    formData.caseNumber || '',
    fileUrls,
    uploadedFiles.length
  ];
  
  // Append row
  sheet.appendRow(rowData);
  console.log(`Added record to ${documentType} spreadsheet`);
}

/**
 * Send email notification
 */
function sendNotificationEmail(formData, results) {
  const successCount = results.filter(r => r.success).length;
  const totalFiles = results.reduce((sum, r) => sum + (r.filesUploaded || 0), 0);
  
  const emailBody = `
New Document Upload - Barbie's Bail Bonds

Timestamp: ${new Date().toISOString()}
Submitted by: ${formData.yourName}
Phone: ${formData.yourPhone}
Defendant: ${formData.defendantName || 'N/A'}
Case Number: ${formData.caseNumber || 'N/A'}

Documents Processed:
${results.map(r => `- ${r.documentType}: ${r.success ? r.filesUploaded + ' files' : 'Failed'}`).join('\n')}

Total Files: ${totalFiles}

Please review the uploaded documents in Google Drive.
  `;
  
  // Replace with actual notification email
  const notificationEmail = 'admin@barbiesbailbonds.com';
  
  MailApp.sendEmail({
    to: notificationEmail,
    subject: `New Document Upload - ${formData.defendantName || formData.yourName}`,
    body: emailBody
  });
  
  console.log('Notification email sent');
}

/**
 * Test function
 */
function testUpload() {
  const testEvent = {
    postData: {
      contents: JSON.stringify({
        yourName: 'Test User',
        yourPhone: '(561) 247-0018',
        defendantName: 'Test Defendant',
        caseNumber: 'TEST-2025',
        documentSections: [
          {
            documentType: 'Government ID',
            files: [
              {
                filename: 'test-id.jpg',
                contentType: 'image/jpeg',
                size: 1024,
                base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
              }
            ]
          }
        ]
      }),
      type: 'application/json'
    }
  };
  
  try {
    const result = doPost(testEvent);
    const output = JSON.parse(result.getContent());
    console.log('Test result:', output);
    return output;
  } catch (error) {
    console.error('Test failed:', error.toString());
    return { success: false, error: error.toString() };
  }
}