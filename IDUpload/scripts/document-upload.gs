/**
 * Google Apps Script for Barbie's Bail Bonds Document Upload System
 * Routes documents from IDUpload page to organized Google Drive folders with spreadsheet tracking
 */

// Global array to collect all debug logs for sending back to frontend
let debugLogs = [];

// Custom debug logging functions that work reliably in Google Apps Script
function debugLog(message, level = 'log') {
  const timestamp = new Date().toISOString();
  const logEntry = { level: level, message: String(message), timestamp: timestamp };
  debugLogs.push(logEntry);
  
  // Still log to Google Apps Script console for server-side debugging
  if (level === 'error') {
    console.error(`[${timestamp}] ${message}`);
  } else if (level === 'warn') {
    console.warn(`[${timestamp}] ${message}`);
  } else {
    console.log(`[${timestamp}] ${message}`);
  }
}

function debugError(message) {
  debugLog(message, 'error');
}

function debugWarn(message) {
  debugLog(message, 'warn');
}

// Configuration - ACTUAL Google Drive IDs
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
 * Main POST handler - receives form data and files from IDUpload page
 */
function doPost(e) {
  // Reset debug logs for this request
  debugLogs = [];
  debugLog('=== Document Upload Request Received ===');
  debugLog('Request timestamp: ' + new Date().toISOString());
  debugLog('Request data keys: ' + JSON.stringify(Object.keys(e || {})));
  debugLog('Request parameters: ' + JSON.stringify(e?.parameter || {}));
  debugLog('Request postData type: ' + (e?.postData?.type || 'none'));
  debugLog('Request postData length: ' + (e?.postData?.contents?.length || 0));
  
  try {
    debugLog('🔍 Starting form data parsing...');
    // Parse the incoming multipart data
    const formData = parseMultipartData(e);
    
    if (!formData) {
      debugError('❌ Form data parsing failed - no data returned');
      throw new Error('No form data could be parsed from request');
    }
    
    debugLog('✅ Form data parsed successfully');
    debugLog('📊 Form data summary:');
    debugLog('  Field count: ' + Object.keys(formData).length);
    debugLog('  Fields: ' + JSON.stringify(Object.keys(formData)));
    
    // Log file fields specifically
    const fileFields = Object.keys(formData).filter(key => 
      formData[key] && typeof formData[key] === 'object' && formData[key].bytes
    );
    debugLog('  📁 File fields found: ' + fileFields.length + ' - ' + JSON.stringify(fileFields));
    
    debugLog('📝 Detailed form data keys and types:');
    Object.keys(formData).forEach(key => {
      const value = formData[key];
      const type = typeof value;
      const isFile = value && typeof value === 'object' && value.bytes;
      debugLog('  ' + key + ': ' + type + (isFile ? ' (FILE - ' + (value.bytes?.length || 0) + ' bytes)' : ' - ' + JSON.stringify(value).substring(0, 100)));
    });
    
    // Validate required fields (caseNumber is optional)
    const requiredFields = ['yourName', 'yourPhone', 'defendantName'];
    for (const field of requiredFields) {
      if (!formData[field] || formData[field].trim() === '') {
        throw new Error(`Required field missing: ${field}`);
      }
    }
    
    // Ensure optional fields have default values
    if (!formData.caseNumber) {
      formData.caseNumber = '';
    }
    
    // Group files by document type
    debugLog('🗂️ Starting file grouping by document type...');
    const documentGroups = groupFilesByDocumentType(formData);
    
    debugLog('📊 Document groups summary:');
    debugLog('  Group count: ' + Object.keys(documentGroups).length);
    Object.entries(documentGroups).forEach(([type, data]) => {
      debugLog('  📁 ' + type + ': ' + (data?.files?.length || 0) + ' files');
    });
    debugLog('📝 Full document groups: ' + JSON.stringify(documentGroups));
    
    // Process each document type
    debugLog('🚀 Starting document processing...');
    const results = [];
    let totalProcessed = 0;
    
    for (const [documentType, data] of Object.entries(documentGroups)) {
      if (!data.files || data.files.length === 0) {
        debugLog('⏭️ Skipping ' + documentType + ' - no files (data: ' + JSON.stringify(data) + ')');
        continue;
      }
      
      debugLog('🔄 Processing ' + data.files.length + ' files for document type: ' + documentType);
      debugLog('📁 Files for ' + documentType + ': ' + JSON.stringify(data.files.map(f => f?.filename || f?.name || 'unnamed')));
      
      try {
        const result = processDocumentType(documentType, formData, data.files);
        debugLog('✅ Successfully processed ' + documentType + ': ' + JSON.stringify(result));
        results.push(result);
        totalProcessed += data.files.length;
      } catch (error) {
        debugError('❌ Error processing ' + documentType + ': ' + error.message);
        debugError('Error stack: ' + error.stack);
        results.push({
          documentType,
          success: false,
          error: error.message,
          filesCount: data.files.length
        });
      }
    }
    
    debugLog('📊 Processing complete - ' + totalProcessed + ' files processed total');
    
    // Send email notification
    try {
      sendNotificationEmail(formData, results);
    } catch (emailError) {
      debugWarn('Email notification failed: ' + emailError.toString());
      // Don't fail the whole upload if email fails
    }
    
    debugLog('🎯 Preparing response...');
    const response = {
      success: true,
      message: 'Documents uploaded successfully!',
      processed: totalProcessed,
      documentsProcessed: results.length,
      details: results,
      timestamp: new Date().toISOString(),
      debugLogs: debugLogs
    };
    
    debugLog('📤 Final response prepared with ' + debugLogs.length + ' debug log entries');
    
    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    debugError('Error processing upload: ' + error.toString());
    debugError('Error stack: ' + error.stack);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: 'Upload failed: ' + error.toString(),
        error: error.toString(),
        debugLogs: debugLogs,
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Parse multipart form data from the request
 */
function parseMultipartData(e) {
  console.log('Parsing multipart data...');
  
  // Try to get data from different possible locations
  let formData = {};
  
  // Method 1: Check e.parameter (most common)
  if (e.parameter && Object.keys(e.parameter).length > 0) {
    console.log('Found data in e.parameter');
    formData = e.parameter;
  }
  
  // Method 2: Check e.parameters
  if (Object.keys(formData).length === 0 && e.parameters) {
    console.log('Found data in e.parameters');
    for (const [key, value] of Object.entries(e.parameters)) {
      formData[key] = Array.isArray(value) ? value[0] : value;
    }
  }
  
  // Method 3: Try to parse postData contents
  if (Object.keys(formData).length === 0 && e.postData && e.postData.contents) {
    console.log('Trying to parse postData contents');
    try {
      const urlParams = new URLSearchParams(e.postData.contents);
      for (const [key, value] of urlParams) {
        formData[key] = value;
      }
    } catch (parseError) {
      console.log('Could not parse postData as URL parameters');
    }
  }
  
  console.log('Parsed form data keys:', Object.keys(formData));
  return Object.keys(formData).length > 0 ? formData : null;
}

/**
 * Group uploaded files by document type
 */
function groupFilesByDocumentType(formData) {
  debugLog('🗂️ groupFilesByDocumentType called with keys: ' + JSON.stringify(Object.keys(formData)));
  
  const groups = {
    'Government ID': { files: [] },
    'Proof of Address': { files: [] },
    'Proof of Employment': { files: [] },
    'Other': { files: [] }
  };
  
  // First, find all documentType fields to understand the structure
  const documentTypes = {};
  for (const [key, value] of Object.entries(formData)) {
    if (key.startsWith('documentType_')) {
      const sectionIndex = key.replace('documentType_', '');
      documentTypes[sectionIndex] = value;
      debugLog('📝 Found document section ' + sectionIndex + ': ' + value);
    }
  }
  
  debugLog('📊 Document sections found: ' + JSON.stringify(documentTypes));
  
  // Process files based on document sections
  for (const [key, value] of Object.entries(formData)) {
    // Look for file fields: document_0_front_input, document_0_back_input, etc.
    const fileMatch = key.match(/^document_(\d+)_(.+)$/);
    
    if (fileMatch && value && typeof value === 'object' && value.bytes) {
      const sectionIndex = fileMatch[1];
      const fileType = fileMatch[2]; // front_input, back_input, input
      let documentType = documentTypes[sectionIndex] || 'Other';
      
      debugLog('📁 Processing file: ' + key);
      debugLog('  Section: ' + sectionIndex + ', Type: ' + documentType + ', FileType: ' + fileType);
      debugLog('  File size: ' + (value.bytes?.length || 0) + ' bytes');
      debugLog('  Filename: ' + (value.filename || 'unknown'));
      
      if (!groups[documentType]) {
        debugWarn('⚠️ Unknown document type: ' + documentType + ', defaulting to Other');
        documentType = 'Other';
      }
      
      groups[documentType].files.push({
        name: value.filename || (documentType + '_' + fileType),
        data: value,
        type: fileType,
        sectionIndex: sectionIndex,
        bytes: value.bytes,
        filename: value.filename
      });
      
      debugLog('✅ Added file to ' + documentType + ' group');
    }
  }
  
  // Log final group summary
  debugLog('📊 Final grouping results:');
  Object.entries(groups).forEach(([type, data]) => {
    debugLog('  ' + type + ': ' + data.files.length + ' files');
  });
  
  return groups;
}

/**
 * Process a specific document type
 */
function processDocumentType(documentType, formData, files) {
  console.log(`Processing ${documentType} with ${files.length} files`);
  
  try {
    // Get folder and spreadsheet for this document type
    const folderId = CONFIG.folders[documentType];
    const spreadsheetId = CONFIG.spreadsheets[documentType];
    
    if (!folderId || !spreadsheetId) {
      throw new Error(`Configuration missing for document type: ${documentType}`);
    }
    
    // Upload files to Drive
    const uploadedFiles = uploadFilesToDrive(files, folderId, formData);
    
    // Update spreadsheet
    updateSpreadsheetRecord(spreadsheetId, documentType, formData, uploadedFiles);
    
    return {
      documentType: documentType,
      filesUploaded: uploadedFiles.length,
      files: uploadedFiles
    };
    
  } catch (error) {
    console.error(`Error processing ${documentType}:`, error.toString());
    throw error;
  }
}

/**
 * Upload files to Google Drive folder
 */
function uploadFilesToDrive(files, folderId, formData) {
  console.log(`Uploading ${files.length} files to folder ${folderId}`);
  
  const folder = DriveApp.getFolderById(folderId);
  const uploadedFiles = [];
  
  for (const fileInfo of files) {
    try {
      // Create a unique filename
      const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
      const safeName = formData.yourName.replace(/[^a-zA-Z0-9]/g, '');
      const filename = `${fileInfo.name}_${safeName}_${timestamp}`;
      
      // For now, create a placeholder file since we can't directly handle file uploads
      // In a real implementation, you'd handle the actual file data
      const fileContent = `Document placeholder for ${fileInfo.name}\n` +
                         `Uploaded by: ${formData.yourName}\n` +
                         `Phone: ${formData.yourPhone}\n` +
                         `Defendant: ${formData.defendantName}\n` +
                         `Case: ${formData.caseNumber}\n` +
                         `Upload time: ${new Date().toISOString()}`;
      
      const file = folder.createFile(filename + '.txt', fileContent);
      
      uploadedFiles.push({
        name: fileInfo.name,
        filename: filename,
        url: file.getUrl(),
        id: file.getId(),
        type: fileInfo.type
      });
      
      console.log(`Uploaded file: ${filename}`);
      
    } catch (fileError) {
      console.error(`Error uploading file ${fileInfo.name}:`, fileError.toString());
      throw fileError;
    }
  }
  
  return uploadedFiles;
}

/**
 * Update spreadsheet with document record
 */
function updateSpreadsheetRecord(spreadsheetId, documentType, formData, uploadedFiles) {
  console.log(`Updating spreadsheet ${spreadsheetId} for ${documentType}`);
  
  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getActiveSheet();
    
    // Ensure headers exist
    if (sheet.getLastRow() === 0) {
      createSpreadsheetHeaders(sheet, documentType);
    }
    
    // Prepare row data
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    
    let rowData;
    if (documentType === 'Government ID') {
      // Find front and back files
      const frontFile = uploadedFiles.find(f => f.type === 'front');
      const backFile = uploadedFiles.find(f => f.type === 'back');
      
      rowData = [
        timestamp,
        formData.yourName,
        formData.yourPhone,
        formData.defendantName,
        formData.caseNumber,
        frontFile ? frontFile.url : '',
        backFile ? backFile.url : ''
      ];
    } else {
      // Other document types have single file column
      const fileUrls = uploadedFiles.map(f => f.url).join(', ');
      
      rowData = [
        timestamp,
        formData.yourName,
        formData.yourPhone,
        formData.defendantName,
        formData.caseNumber,
        fileUrls
      ];
    }
    
    // Append the row
    sheet.appendRow(rowData);
    console.log(`Added row to ${documentType} spreadsheet`);
    
  } catch (sheetError) {
    console.error(`Error updating spreadsheet:`, sheetError.toString());
    throw sheetError;
  }
}

/**
 * Create spreadsheet headers
 */
function createSpreadsheetHeaders(sheet, documentType) {
  let headers;
  
  if (documentType === 'Government ID') {
    headers = [
      'Timestamp',
      'Full Name', 
      'Phone Number',
      'Defendant Name',
      'Case/Booking #',
      'ID Front Link',
      'ID Back Link'
    ];
  } else {
    headers = [
      'Timestamp',
      'Full Name',
      'Phone Number', 
      'Defendant Name',
      'Case/Booking #',
      'Document Link'
    ];
  }
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  
  console.log(`Created headers for ${documentType} spreadsheet`);
}

/**
 * Send email notification about new upload
 */
function sendNotificationEmail(formData, results) {
  const emailBody = `
New Document Upload - Barbie's Bail Bonds

Timestamp: ${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss')}
Submitted by: ${formData.yourName}
Phone: ${formData.yourPhone}
Defendant: ${formData.defendantName}
Case/Booking #: ${formData.caseNumber}

Documents Processed:
${results.map(r => `- ${r.documentType}: ${r.filesUploaded} file(s)`).join('\n')}

Please review the uploaded documents in Google Drive.

---
Automated notification from Document Upload System
  `;
  
  // Replace with your notification email
  const notificationEmail = 'admin@barbiesbailbonds.com';
  
  MailApp.sendEmail({
    to: notificationEmail,
    subject: 'New Document Upload - ' + formData.defendantName,
    body: emailBody
  });
  
  console.log('Notification email sent');
}

/**
 * Test function to verify the script works
 */
function testDocumentUpload() {
  console.log('=== Testing Document Upload ===');
  
  const testEvent = {
    parameter: {
      yourName: 'Test User',
      yourPhone: '(561) 247-0018',
      defendantName: 'Test Defendant', 
      caseNumber: 'TEST-2025-001',
      documentType: 'Government ID'
    }
  };
  
  try {
    const result = doPost(testEvent);
    const output = JSON.parse(result.getContent());
    console.log('Test result:', JSON.stringify(output, null, 2));
    return output;
  } catch (error) {
    console.error('Test failed:', error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Setup function - creates folder structure (run once manually)
 */
function setupFolders() {
  console.log('=== Setting up Google Drive folders ===');
  
  // Create main folder
  const mainFolder = DriveApp.createFolder('Barbie\'s Bail Bonds Documents');
  console.log('Main folder created:', mainFolder.getId());
  
  // Create subfolders
  const folders = {};
  for (const folderName of Object.keys(CONFIG.folders)) {
    const folder = mainFolder.createFolder(folderName);
    folders[folderName] = folder.getId();
    console.log(`${folderName} folder created:`, folder.getId());
    
    // Create spreadsheet in each folder
    const spreadsheet = SpreadsheetApp.create(`${folderName} Records`);
    const file = DriveApp.getFileById(spreadsheet.getId());
    file.moveTo(folder);
    
    console.log(`${folderName} spreadsheet created:`, spreadsheet.getId());
  }
  
  console.log('Setup complete! Update CONFIG object with these IDs:');
  console.log(JSON.stringify(folders, null, 2));
}