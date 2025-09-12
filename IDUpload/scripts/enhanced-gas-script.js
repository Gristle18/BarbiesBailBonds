/**
 * Enhanced Google Apps Script for Barbie's Bail Bonds
 * Handles both bail bond applications AND document uploads
 */

function doPost(e) {
  console.log('=== DEBUG: doPost function called ===');
  console.log('Raw event object:', JSON.stringify(e, null, 2));
  
  try {
    let formData = null;
    
    // Try to parse JSON first
    if (e.postData && e.postData.contents) {
      console.log('DEBUG: Attempting to parse JSON from postData.contents');
      try {
        formData = JSON.parse(e.postData.contents);
        console.log('DEBUG: Successfully parsed JSON data');
      } catch (jsonError) {
        console.log('DEBUG: JSON parsing failed:', jsonError.toString());
        
        // Try to parse as URL-encoded data
        try {
          console.log('DEBUG: Attempting to parse as URL-encoded data');
          const urlParams = new URLSearchParams(e.postData.contents);
          formData = {};
          for (const [key, value] of urlParams) {
            formData[key] = value;
          }
          console.log('DEBUG: Successfully parsed URL-encoded data');
        } catch (urlError) {
          console.log('DEBUG: URL-encoded parsing also failed:', urlError.toString());
        }
      }
    }
    
    // Check if we have any form data
    if (!formData || Object.keys(formData).length === 0) {
      console.log('DEBUG: No form data could be parsed');
      
      // Check for parameters directly in the event
      if (e.parameter && Object.keys(e.parameter).length > 0) {
        console.log('DEBUG: Found parameters in event.parameter');
        formData = e.parameter;
      } else if (e.parameters && Object.keys(e.parameters).length > 0) {
        console.log('DEBUG: Found parameters in event.parameters');
        formData = {};
        for (const key in e.parameters) {
          formData[key] = Array.isArray(e.parameters[key]) ? e.parameters[key][0] : e.parameters[key];
        }
      }
    }
    
    console.log('DEBUG: Final form data object:', JSON.stringify(formData, null, 2));
    
    if (!formData || Object.keys(formData).length === 0) {
      throw new Error('No form data received or could be parsed');
    }
    
    // Determine if this is a document upload or bail bond application
    const isDocumentUpload = formData.hasOwnProperty('uploadedDocuments') || formData.hasOwnProperty('documentCount');
    
    let result;
    if (isDocumentUpload) {
      console.log('DEBUG: Processing as document upload');
      result = submitDocumentUpload(formData);
    } else {
      console.log('DEBUG: Processing as bail bond application');
      result = submitBailBondApplication(formData);
    }
    
    console.log('DEBUG: Processing returned:', JSON.stringify(result, null, 2));
    
    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('ERROR in doPost:', error.toString());
    console.error('ERROR stack trace:', error.stack);
    
    // Return error response
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: 'Error processing request: ' + error.toString(),
        debug: {
          hasPostData: !!e.postData,
          hasParameter: !!e.parameter,
          hasParameters: !!e.parameters,
          eventKeys: Object.keys(e)
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function submitDocumentUpload(formData) {
  console.log('=== DEBUG: submitDocumentUpload function called ===');
  console.log('DEBUG: Input form data:', JSON.stringify(formData, null, 2));
  
  try {
    // Get or create the spreadsheet
    const spreadsheetId = '1T7pR7QPP3ElfDoQnODWIHcpDlKCKOmPT02WmvFtBPSE'; // Your actual Google Sheet ID
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    
    // Get or create the documents sheet
    let docSheet = spreadsheet.getSheetByName('DocumentUploads');
    if (!docSheet) {
      console.log('DEBUG: Creating DocumentUploads sheet');
      docSheet = spreadsheet.insertSheet('DocumentUploads');
      
      // Add headers for document tracking
      const headers = [
        'Timestamp',
        'Applicant Name',
        'Applicant Phone', 
        'Defendant Name',
        'Case Number',
        'Language',
        'Document Count',
        'Documents Details',
        'Status'
      ];
      
      docSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      docSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      docSheet.setFrozenRows(1);
      console.log('DEBUG: DocumentUploads sheet created with headers');
    }
    
    // Parse uploaded documents
    let uploadedDocs = [];
    try {
      uploadedDocs = JSON.parse(formData.uploadedDocuments || '[]');
    } catch (parseError) {
      console.log('DEBUG: Error parsing uploaded documents:', parseError.toString());
    }
    
    // Prepare row data
    const rowData = [
      formData.timestamp || new Date().toISOString(),
      formData.yourName || '',
      formData.yourPhone || '',
      formData.defendantName || '',
      formData.caseNumber || '',
      formData.language || '',
      formData.documentCount || uploadedDocs.length,
      JSON.stringify(uploadedDocs),
      'Pending'
    ];
    
    console.log('DEBUG: Row data prepared:', JSON.stringify(rowData, null, 2));
    
    // Add the data to the sheet
    docSheet.appendRow(rowData);
    console.log('DEBUG: Successfully appended row to DocumentUploads sheet');
    
    // Auto-resize columns
    docSheet.autoResizeColumns(1, rowData.length);
    
    // Send email notification
    try {
      const emailBody = `
New Document Upload Received

Timestamp: ${rowData[0]}
Applicant: ${rowData[1]}
Phone: ${rowData[2]}
Defendant: ${rowData[3]}
Case Number: ${rowData[4]}
Language: ${rowData[5]}
Document Count: ${rowData[6]}

Documents Uploaded:
${uploadedDocs.map(doc => `- ${doc.documentType}: ${doc.fileName} (${Math.round(doc.fileSize/1024)}KB)`).join('\n')}

NOTE: Actual files need to be texted to 561-247-0018

View details in spreadsheet: ${spreadsheet.getUrl()}
      `;
      
      MailApp.sendEmail({
        to: 'admin@barbiesbailbonds.com',
        subject: 'New Document Upload - Barbie\'s Bail Bonds',
        body: emailBody
      });
      console.log('DEBUG: Email notification sent successfully');
    } catch (emailError) {
      console.log('DEBUG: Email notification failed:', emailError.toString());
    }
    
    return { 
      success: true, 
      message: 'Document upload information recorded successfully!',
      documentCount: uploadedDocs.length
    };
    
  } catch (error) {
    console.error('ERROR in submitDocumentUpload:', error.toString());
    console.error('ERROR stack trace:', error.stack);
    throw new Error('Failed to record document upload. Please try again or call us directly.');
  }
}

function submitBailBondApplication(formData) {
  console.log('=== DEBUG: submitBailBondApplication function called ===');
  // This is your existing submitToSheet function renamed
  // [Keep all your existing bail bond application logic here]
  
  try {
    // Get or create the spreadsheet
    const spreadsheetId = '1T7pR7QPP3ElfDoQnODWIHcpDlKCKOmPT02WmvFtBPSE';
    let spreadsheet;
    
    try {
      spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      console.log('DEBUG: Successfully opened spreadsheet');
    } catch (e) {
      console.log('DEBUG: Failed to open existing spreadsheet:', e.toString());
      spreadsheet = SpreadsheetApp.create('Barbie\'s Bail Bonds Applications');
      console.log('DEBUG: Created new spreadsheet with ID:', spreadsheet.getId());
    }
    
    // Get or create the main sheet
    let sheet = spreadsheet.getSheetByName('Applications');
    if (!sheet) {
      console.log('DEBUG: Creating Applications sheet');
      sheet = spreadsheet.insertSheet('Applications');
      
      // Add headers (your existing headers)
      const headers = [
        'Timestamp', 'Who Are You', 'How Heard About Us', 'Indemnitor Name', 'Relation',
        'Indemnitor DOB', 'Indemnitor SSN', 'Indemnitor DL', 'Indemnitor Cell',
        'Indemnitor Home Phone', 'Indemnitor Email', 'Indemnitor Address', 'Indemnitor How Long',
        'Indemnitor Work Type', 'Indemnitor Employer', 'Indemnitor Work Phone', 'Indemnitor Work Address',
        'Indemnitor Vehicle', 'Defendant Name', 'Defendant Nick', 'Defendant DOB', 'Defendant SSN',
        'Defendant DL', 'Birth City State', 'Citizenship', 'Race', 'Defendant Cell',
        'Defendant Home Phone', 'Defendant Email', 'Defendant Address', 'Defendant How Long',
        'Home Status', 'Landlord Name', 'Defendant Work Type', 'Defendant Employer',
        'Defendant Work Phone', 'Defendant Work Address', 'Recent Arrest', 'Failed to Appear',
        'On Supervision', 'Other Bond', 'Defendant Vehicle', 'Relationship Status', 'Partner Name',
        'Partner DOB', 'Partner Cell', 'Partner Work Type', 'Partner Work Name', 'Mother Name',
        'Mother Phone', 'Mother Address', 'Father Name', 'Father Phone', 'Father Address',
        'Sibling 1 Name', 'Sibling 1 Phone', 'Sibling 2 Name', 'Sibling 2 Phone',
        'Reference 1 Name', 'Reference 1 Relation', 'Reference 1 Phone', 'Reference 2 Name',
        'Reference 2 Relation', 'Reference 2 Phone', 'Reference 3 Name', 'Reference 3 Relation',
        'Reference 3 Phone', 'Emergency 1 Name', 'Emergency 1 Phone', 'Emergency 1 Relation',
        'Emergency 2 Name', 'Emergency 2 Phone', 'Emergency 2 Relation', 'Agree Name'
      ];
      
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    
    // Prepare row data (your existing logic)
    const rowData = [
      formData.timestamp || new Date().toISOString(),
      formData.whoAreYou || '', formData.howHeard || '', formData.indemnitorName || '',
      formData.relation || '', formData.indemnitorDob || '', formData.indemnitorSsn || '',
      formData.indemnitorDl || '', formData.indemnitorCell || '', formData.indemnitorHomePhone || '',
      formData.indemnitorEmail || '', formData.indemnitorAddress || '', formData.indemnitorHowLong || '',
      formData.indemnitorWorkType || '', formData.indemnitorEmployer || '', formData.indemnitorWorkPhone || '',
      formData.indemnitorWorkAddress || '', formData.indemnitorVehicle || '', formData.defendantName || '',
      formData.defendantNick || '', formData.defendantDob || '', formData.defendantSsn || '',
      formData.defendantDl || '', formData.birthCityState || '', formData.citizenship || '',
      formData.race || '', formData.defendantCell || '', formData.defendantHomePhone || '',
      formData.defendantEmail || '', formData.defendantAddress || '', formData.defendantHowLong || '',
      formData.homeStatus || '', formData.landlordName || '', formData.defendantWorkType || '',
      formData.defendantEmployer || '', formData.defendantWorkPhone || '', formData.defendantWorkAddress || '',
      formData.recentArrest || '', formData.q_fta || '', formData.q_supervision || '',
      formData.q_otherBond || '', formData.defendantVehicle || '', formData.relationshipStatus || '',
      formData.partnerName || '', formData.partnerDob || '', formData.partnerCell || '',
      formData.partnerWorkType || '', formData.partnerWorkName || '', formData.motherName || '',
      formData.motherPhone || '', formData.motherAddress || '', formData.fatherName || '',
      formData.fatherPhone || '', formData.fatherAddress || '', formData.sibling1Name || '',
      formData.sibling1Phone || '', formData.sibling2Name || '', formData.sibling2Phone || '',
      formData.ref1Name || '', formData.ref1Relation || '', formData.ref1Phone || '',
      formData.ref2Name || '', formData.ref2Relation || '', formData.ref2Phone || '',
      formData.ref3Name || '', formData.ref3Relation || '', formData.ref3Phone || '',
      formData.emergency1Name || '', formData.emergency1Phone || '', formData.emergency1Relation || '',
      formData.emergency2Name || '', formData.emergency2Phone || '', formData.emergency2Relation || '',
      formData.agreeName || ''
    ];
    
    // Add the data to the sheet
    sheet.appendRow(rowData);
    console.log('DEBUG: Successfully appended row to Applications sheet');
    
    // Auto-resize columns
    sheet.autoResizeColumns(1, rowData.length);
    
    // Send email notification
    try {
      const emailBody = `
New Bail Bond Application Received

Timestamp: ${rowData[0]}
Applicant Type: ${rowData[1]}
Indemnitor: ${rowData[3]}
Defendant: ${rowData[18]}
Phone: ${rowData[8]}
Email: ${rowData[10]}

View all details in the spreadsheet: ${spreadsheet.getUrl()}
      `;
      
      MailApp.sendEmail({
        to: 'admin@barbiesbailbonds.com',
        subject: 'New Bail Bond Application',
        body: emailBody
      });
      console.log('DEBUG: Email notification sent successfully');
    } catch (emailError) {
      console.log('DEBUG: Email notification failed:', emailError.toString());
    }
    
    return { success: true, message: 'Application submitted successfully!' };
    
  } catch (error) {
    console.error('ERROR in submitBailBondApplication:', error.toString());
    console.error('ERROR stack trace:', error.stack);
    throw new Error('Failed to submit application. Please try again or call us directly.');
  }
}

/**
 * Test functions
 */
function testDocumentUpload() {
  const testData = {
    timestamp: new Date().toISOString(),
    yourName: 'Test User',
    yourPhone: '(561) 247-0018',
    defendantName: 'Test Defendant',
    caseNumber: 'TEST-2024-001',
    language: 'English',
    documentCount: 2,
    uploadedDocuments: JSON.stringify([
      {
        documentType: 'Government ID',
        fileName: 'id_front.jpg',
        fileSize: 1024000,
        fileType: 'image/jpeg',
        inputName: 'idFront'
      },
      {
        documentType: 'Proof of Address',
        fileName: 'utility_bill.pdf',
        fileSize: 2048000,
        fileType: 'application/pdf',
        inputName: 'docs'
      }
    ])
  };
  
  console.log('Testing document upload with:', JSON.stringify(testData, null, 2));
  const result = submitDocumentUpload(testData);
  console.log('Test result:', JSON.stringify(result, null, 2));
  return result;
}