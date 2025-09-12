/**
 * Google Apps Script for Barbie's Bail Bonds Document Upload with OCR
 * This script receives uploaded documents, processes them with OCR, and stores data in Google Sheets
 */

function doPost(e) {
  console.log('=== DEBUG: Document upload doPost called ===');
  console.log('Raw event object:', JSON.stringify(e, null, 2));
  
  try {
    const formData = {};
    const files = [];
    
    // Handle multipart form data
    if (e.postData && e.postData.type && e.postData.type.includes('multipart/form-data')) {
      // Google Apps Script automatically parses multipart data into e.parameters
      console.log('DEBUG: Processing multipart form data');
      
      // Extract text fields
      Object.keys(e.parameters).forEach(key => {
        if (!key.startsWith('file_')) {
          formData[key] = Array.isArray(e.parameters[key]) ? e.parameters[key][0] : e.parameters[key];
        }
      });
      
      // Extract files (you'll need to handle file uploads differently)
      // Files in Google Apps Script are handled through Google Drive API
      console.log('DEBUG: Form data extracted:', JSON.stringify(formData, null, 2));
    }
    
    // Process the upload
    const result = processDocumentUpload(formData, files);
    
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('ERROR in doPost:', error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: 'Error processing upload: ' + error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function processDocumentUpload(formData, files) {
  console.log('=== DEBUG: processDocumentUpload called ===');
  
  try {
    // Get or create the spreadsheet for documents
    const documentSpreadsheetId = '1T7pR7QPP3ElfDoQnODWIHcpDlKCKOmPT02WmvFtBPSE'; // Same or different sheet
    const spreadsheet = SpreadsheetApp.openById(documentSpreadsheetId);
    
    // Get or create the documents sheet
    let docSheet = spreadsheet.getSheetByName('Documents');
    if (!docSheet) {
      docSheet = spreadsheet.insertSheet('Documents');
      
      // Add headers for document tracking
      const headers = [
        'Timestamp',
        'Applicant Name',
        'Applicant Phone', 
        'Defendant Name',
        'Case Number',
        'Document Type',
        'Document Name',
        'File ID',
        'OCR Text',
        'OCR Extracted Data'
      ];
      
      docSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      docSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      docSheet.setFrozenRows(1);
    }
    
    // Process uploaded files with OCR
    const processedFiles = [];
    
    // For each file, we would:
    // 1. Save to Google Drive
    // 2. Run OCR using Google Drive API
    // 3. Extract structured data
    // 4. Save to spreadsheet
    
    // Example OCR processing (you'll need to implement file handling)
    /*
    files.forEach((file, index) => {
      try {
        // Save file to Drive
        const driveFile = DriveApp.createFile(file.blob);
        const fileId = driveFile.getId();
        
        // Run OCR
        const ocrText = extractTextFromImage(fileId);
        
        // Extract structured data based on document type
        const extractedData = extractStructuredData(ocrText, formData.documentType);
        
        // Save to sheet
        const rowData = [
          new Date().toISOString(),
          formData.yourName || '',
          formData.yourPhone || '',
          formData.defendantName || '',
          formData.caseNumber || '',
          formData.documentType || 'Unknown',
          file.name,
          fileId,
          ocrText,
          JSON.stringify(extractedData)
        ];
        
        docSheet.appendRow(rowData);
        processedFiles.push({
          name: file.name,
          fileId: fileId,
          ocrText: ocrText,
          extractedData: extractedData
        });
        
      } catch (fileError) {
        console.error('Error processing file:', fileError.toString());
      }
    });
    */
    
    // For now, just save the form data
    const rowData = [
      new Date().toISOString(),
      formData.yourName || '',
      formData.yourPhone || '',
      formData.defendantName || '',
      formData.caseNumber || '',
      'Form Submission', // Document Type
      'Form Data', // Document Name
      '', // File ID
      '', // OCR Text
      JSON.stringify(formData) // Form data as JSON
    ];
    
    docSheet.appendRow(rowData);
    
    // Send email notification
    try {
      const emailBody = `
New Document Upload Received

Timestamp: ${rowData[0]}
Applicant: ${rowData[1]}
Phone: ${rowData[2]}
Defendant: ${rowData[3]}
Case Number: ${rowData[4]}

Form Data: ${JSON.stringify(formData, null, 2)}

View details in spreadsheet: ${spreadsheet.getUrl()}
      `;
      
      MailApp.sendEmail({
        to: 'admin@barbiesbailbonds.com',
        subject: 'New Document Upload - Barbie\'s Bail Bonds',
        body: emailBody
      });
    } catch (emailError) {
      console.log('Email notification failed:', emailError.toString());
    }
    
    return { 
      success: true, 
      message: 'Documents uploaded successfully!',
      processedFiles: processedFiles
    };
    
  } catch (error) {
    console.error('ERROR in processDocumentUpload:', error.toString());
    throw error;
  }
}

/**
 * Extract text from image using Google Drive API OCR
 */
function extractTextFromImage(fileId) {
  try {
    const file = DriveApp.getFileById(fileId);
    
    // For images, convert to Google Docs to trigger OCR
    if (file.getBlob().getContentType().startsWith('image/')) {
      const docFile = Drive.Files.copy({
        title: file.getName() + '_ocr',
        parents: [{id: DriveApp.getRootFolder().getId()}]
      }, fileId, {
        ocr: true,
        ocrLanguage: 'en'
      });
      
      // Get the OCR'd text
      const doc = DocumentApp.openById(docFile.id);
      const text = doc.getBody().getText();
      
      // Clean up the temporary doc
      DriveApp.getFileById(docFile.id).setTrashed(true);
      
      return text;
    }
    
    return '';
    
  } catch (error) {
    console.error('Error extracting text:', error.toString());
    return '';
  }
}

/**
 * Extract structured data from OCR text based on document type
 */
function extractStructuredData(ocrText, documentType) {
  const extractedData = {};
  
  try {
    switch (documentType) {
      case 'Government ID':
      case 'ID Gubernamental':
        // Extract ID information
        const nameMatch = ocrText.match(/(?:NAME|NOMBRE)[:\s]*([A-Z\s]+)/i);
        const dobMatch = ocrText.match(/(?:DOB|BIRTH|FECHA)[:\s]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i);
        const idMatch = ocrText.match(/(?:ID|LICENSE|DL)[:\s]*([A-Z0-9]+)/i);
        const addressMatch = ocrText.match(/(?:ADDRESS|DIRECCION)[:\s]*([A-Z0-9\s,]+)/i);
        
        if (nameMatch) extractedData.name = nameMatch[1].trim();
        if (dobMatch) extractedData.dateOfBirth = dobMatch[1];
        if (idMatch) extractedData.idNumber = idMatch[1];
        if (addressMatch) extractedData.address = addressMatch[1].trim();
        break;
        
      case 'Proof of Address':
      case 'Comprobante de Domicilio':
        // Extract address information
        const addressMatch2 = ocrText.match(/([0-9]+[A-Z0-9\s,#.-]+(?:ST|STREET|AVE|AVENUE|RD|ROAD|LN|LANE|DR|DRIVE|CT|COURT|PL|PLACE|BLVD|BOULEVARD))/i);
        const cityStateMatch = ocrText.match(/([A-Z\s]+),\s*([A-Z]{2})\s*(\d{5})/i);
        
        if (addressMatch2) extractedData.address = addressMatch2[1].trim();
        if (cityStateMatch) {
          extractedData.city = cityStateMatch[1].trim();
          extractedData.state = cityStateMatch[2];
          extractedData.zipCode = cityStateMatch[3];
        }
        break;
        
      case 'Proof of Employment':
      case 'Comprobante de Empleo':
        // Extract employment information
        const employerMatch = ocrText.match(/(?:EMPLOYER|COMPANY|EMPLEADOR)[:\s]*([A-Z\s&.-]+)/i);
        const positionMatch = ocrText.match(/(?:POSITION|TITLE|PUESTO)[:\s]*([A-Z\s]+)/i);
        const salaryMatch = ocrText.match(/(?:SALARY|WAGE|SALARIO|SUELDO)[:\s]*\$?([0-9,\.]+)/i);
        
        if (employerMatch) extractedData.employer = employerMatch[1].trim();
        if (positionMatch) extractedData.position = positionMatch[1].trim();
        if (salaryMatch) extractedData.salary = salaryMatch[1];
        break;
    }
    
  } catch (error) {
    console.error('Error extracting structured data:', error.toString());
  }
  
  return extractedData;
}

/**
 * Test function for document processing
 */
function testDocumentUpload() {
  const testData = {
    yourName: 'Test User',
    yourPhone: '(561) 247-0018',
    defendantName: 'Test Defendant',
    caseNumber: 'TEST-2024-001',
    documentType: 'Government ID'
  };
  
  const result = processDocumentUpload(testData, []);
  console.log('Test result:', JSON.stringify(result, null, 2));
  return result;
}