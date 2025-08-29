/**
 * Google Apps Script for Barbie's Bail Bonds Application Form
 * This script receives form data and stores it in Google Sheets
 */

function doGet() {
  return HtmlService.createTemplateFromFile('bail-bond-application')
    .evaluate()
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  console.log('=== DEBUG: doPost function called ===');
  console.log('Raw event object:', JSON.stringify(e, null, 2));
  
  try {
    // Log the raw request data
    if (e.postData) {
      console.log('DEBUG: postData exists');
      console.log('postData.contents:', e.postData.contents);
      console.log('postData.type:', e.postData.type);
    } else {
      console.log('DEBUG: No postData found in event');
      console.log('DEBUG: Full event keys:', Object.keys(e));
    }
    
    let formData = null;
    
    // Try to parse JSON first
    if (e.postData && e.postData.contents) {
      console.log('DEBUG: Attempting to parse JSON from postData.contents');
      try {
        formData = JSON.parse(e.postData.contents);
        console.log('DEBUG: Successfully parsed JSON data');
        console.log('DEBUG: Parsed form data keys:', Object.keys(formData));
        console.log('DEBUG: First few fields:', {
          whoAreYou: formData.whoAreYou,
          indemnitorName: formData.indemnitorName,
          defendantName: formData.defendantName
        });
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
          console.log('DEBUG: URL-encoded data keys:', Object.keys(formData));
        } catch (urlError) {
          console.log('DEBUG: URL-encoded parsing also failed:', urlError.toString());
          
          // Try to handle as form-data (multipart/form-data)
          if (e.postData.type && e.postData.type.includes('multipart/form-data')) {
            console.log('DEBUG: Attempting to parse multipart form data');
            // For multipart data, Google Apps Script should populate e.parameter automatically
          }
        }
      }
    }
    
    // Check if we have any form data
    if (!formData || Object.keys(formData).length === 0) {
      console.log('DEBUG: No form data could be parsed');
      console.log('DEBUG: Checking for parameters in event...');
      
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
    
    // Submit to sheet
    console.log('DEBUG: About to call submitToSheet');
    const result = submitToSheet(formData);
    console.log('DEBUG: submitToSheet returned:', JSON.stringify(result, null, 2));
    
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

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function submitToSheet(formData) {
  console.log('=== DEBUG: submitToSheet function called ===');
  console.log('DEBUG: Input form data:', JSON.stringify(formData, null, 2));
  
  try {
    // Get or create the spreadsheet
    const spreadsheetId = '1T7pR7QPP3ElfDoQnODWIHcpDlKCKOmPT02WmvFtBPSE'; // Your actual Google Sheet ID
    console.log('DEBUG: Attempting to open spreadsheet with ID:', spreadsheetId);
    let spreadsheet;
    
    try {
      spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      console.log('DEBUG: Successfully opened spreadsheet');
      console.log('DEBUG: Spreadsheet name:', spreadsheet.getName());
      console.log('DEBUG: Spreadsheet URL:', spreadsheet.getUrl());
    } catch (e) {
      console.log('DEBUG: Failed to open existing spreadsheet:', e.toString());
      // If spreadsheet doesn't exist, create a new one
      spreadsheet = SpreadsheetApp.create('Barbie\'s Bail Bonds Applications');
      console.log('DEBUG: Created new spreadsheet with ID:', spreadsheet.getId());
      console.log('DEBUG: New spreadsheet URL:', spreadsheet.getUrl());
    }
    
    // Get or create the main sheet
    console.log('DEBUG: Attempting to get "Applications" sheet');
    let sheet = spreadsheet.getSheetByName('Applications');
    if (!sheet) {
      console.log('DEBUG: "Applications" sheet not found, creating new sheet');
      sheet = spreadsheet.insertSheet('Applications');
      console.log('DEBUG: Created new "Applications" sheet');
      
      // Add headers
      console.log('DEBUG: Adding headers to new sheet');
      const headers = [
        'Timestamp',
        'Who Are You',
        'How Heard About Us',
        'Indemnitor Name',
        'Relation',
        'Indemnitor DOB',
        'Indemnitor SSN',
        'Indemnitor DL',
        'Indemnitor Cell',
        'Indemnitor Home Phone',
        'Indemnitor Email',
        'Indemnitor Address',
        'Indemnitor How Long',
        'Indemnitor Work Type',
        'Indemnitor Employer',
        'Indemnitor Work Phone',
        'Indemnitor Work Address',
        'Indemnitor Vehicle',
        'Defendant Name',
        'Defendant Nick',
        'Defendant DOB',
        'Defendant SSN',
        'Defendant DL',
        'Birth City State',
        'Citizenship',
        'Race',
        'Defendant Cell',
        'Defendant Home Phone',
        'Defendant Email',
        'Defendant Address',
        'Defendant How Long',
        'Home Status',
        'Landlord Name',
        'Defendant Work Type',
        'Defendant Employer',
        'Defendant Work Phone',
        'Defendant Work Address',
        'Recent Arrest',
        'Failed to Appear',
        'On Supervision',
        'Other Bond',
        'Defendant Vehicle',
        'Relationship Status',
        'Partner Name',
        'Partner DOB',
        'Partner Cell',
        'Partner Work Type',
        'Partner Work Name',
        'Mother Name',
        'Mother Phone',
        'Mother Address',
        'Father Name',
        'Father Phone',
        'Father Address',
        'Sibling 1 Name',
        'Sibling 1 Phone',
        'Sibling 2 Name',
        'Sibling 2 Phone',
        'Reference 1 Name',
        'Reference 1 Relation',
        'Reference 1 Phone',
        'Reference 2 Name',
        'Reference 2 Relation',
        'Reference 2 Phone',
        'Reference 3 Name',
        'Reference 3 Relation',
        'Reference 3 Phone',
        'Emergency 1 Name',
        'Emergency 1 Phone',
        'Emergency 1 Relation',
        'Emergency 2 Name',
        'Emergency 2 Phone',
        'Emergency 2 Relation',
        'Agree Name'
      ];
      
      console.log('DEBUG: Headers array length:', headers.length);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
      console.log('DEBUG: Headers successfully added and formatted');
    } else {
      console.log('DEBUG: Found existing "Applications" sheet');
      console.log('DEBUG: Sheet has', sheet.getLastRow(), 'rows and', sheet.getLastColumn(), 'columns');
    }
    
    // Prepare row data
    console.log('DEBUG: Preparing row data from form data');
    const rowData = [
      formData.timestamp || new Date().toISOString(),
      formData.whoAreYou || '',
      formData.howHeard || '',
      formData.indemnitorName || '',
      formData.relation || '',
      formData.indemnitorDob || '',
      formData.indemnitorSsn || '',
      formData.indemnitorDl || '',
      formData.indemnitorCell || '',
      formData.indemnitorHomePhone || '',
      formData.indemnitorEmail || '',
      formData.indemnitorAddress || '',
      formData.indemnitorHowLong || '',
      formData.indemnitorWorkType || '',
      formData.indemnitorEmployer || '',
      formData.indemnitorWorkPhone || '',
      formData.indemnitorWorkAddress || '',
      formData.indemnitorVehicle || '',
      formData.defendantName || '',
      formData.defendantNick || '',
      formData.defendantDob || '',
      formData.defendantSsn || '',
      formData.defendantDl || '',
      formData.birthCityState || '',
      formData.citizenship || '',
      formData.race || '',
      formData.defendantCell || '',
      formData.defendantHomePhone || '',
      formData.defendantEmail || '',
      formData.defendantAddress || '',
      formData.defendantHowLong || '',
      formData.homeStatus || '',
      formData.landlordName || '',
      formData.defendantWorkType || '',
      formData.defendantEmployer || '',
      formData.defendantWorkPhone || '',
      formData.defendantWorkAddress || '',
      formData.recentArrest || '',
      formData.q_fta || '',
      formData.q_supervision || '',
      formData.q_otherBond || '',
      formData.defendantVehicle || '',
      formData.relationshipStatus || '',
      formData.partnerName || '',
      formData.partnerDob || '',
      formData.partnerCell || '',
      formData.partnerWorkType || '',
      formData.partnerWorkName || '',
      formData.motherName || '',
      formData.motherPhone || '',
      formData.motherAddress || '',
      formData.fatherName || '',
      formData.fatherPhone || '',
      formData.fatherAddress || '',
      formData.sibling1Name || '',
      formData.sibling1Phone || '',
      formData.sibling2Name || '',
      formData.sibling2Phone || '',
      formData.ref1Name || '',
      formData.ref1Relation || '',
      formData.ref1Phone || '',
      formData.ref2Name || '',
      formData.ref2Relation || '',
      formData.ref2Phone || '',
      formData.ref3Name || '',
      formData.ref3Relation || '',
      formData.ref3Phone || '',
      formData.emergency1Name || '',
      formData.emergency1Phone || '',
      formData.emergency1Relation || '',
      formData.emergency2Name || '',
      formData.emergency2Phone || '',
      formData.emergency2Relation || '',
      formData.agreeName || ''
    ];
    
    console.log('DEBUG: Row data prepared with', rowData.length, 'fields');
    console.log('DEBUG: First few row data fields:', {
      timestamp: rowData[0],
      whoAreYou: rowData[1],
      indemnitorName: rowData[3],
      defendantName: rowData[18]
    });
    console.log('DEBUG: Full row data:', JSON.stringify(rowData, null, 2));
    
    // Add the data to the sheet
    console.log('DEBUG: Attempting to append row to sheet');
    const currentRow = sheet.getLastRow() + 1;
    console.log('DEBUG: Will append to row number:', currentRow);
    
    sheet.appendRow(rowData);
    console.log('DEBUG: Successfully appended row to sheet');
    
    // Verify the data was actually written
    const newLastRow = sheet.getLastRow();
    console.log('DEBUG: Sheet now has', newLastRow, 'rows (was', currentRow - 1, ')');
    
    // Read back the data we just wrote to verify
    if (newLastRow > 1) {
      const writtenData = sheet.getRange(newLastRow, 1, 1, Math.min(rowData.length, sheet.getLastColumn())).getValues()[0];
      console.log('DEBUG: Data written to sheet (first few columns):', {
        timestamp: writtenData[0],
        whoAreYou: writtenData[1],
        indemnitorName: writtenData[3],
        defendantName: writtenData[18]
      });
    }
    
    // Auto-resize columns
    console.log('DEBUG: Auto-resizing columns');
    sheet.autoResizeColumns(1, Math.min(rowData.length, sheet.getLastColumn()));
    
    // Send email notification (optional)
    console.log('DEBUG: Attempting to send email notification');
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
      
      // Replace with your notification email
      const notificationEmail = 'admin@barbiesbailbonds.com';
      MailApp.sendEmail({
        to: notificationEmail,
        subject: 'New Bail Bond Application',
        body: emailBody
      });
      console.log('DEBUG: Email notification sent successfully');
    } catch (emailError) {
      console.log('DEBUG: Email notification failed:', emailError.toString());
      // Don't fail the whole submission if email fails
    }
    
    console.log('DEBUG: Submission completed successfully');
    return { success: true, message: 'Application submitted successfully!' };
    
  } catch (error) {
    console.error('ERROR in submitToSheet:', error.toString());
    console.error('ERROR stack trace:', error.stack);
    console.log('DEBUG: Error occurred at step - check previous logs for context');
    throw new Error('Failed to submit application. Please try again or call us directly.');
  }
}

/**
 * Test function to verify the script works
 */
function testSubmission() {
  console.log('=== DEBUG: Running test submission ===');
  const testData = {
    timestamp: new Date().toISOString(),
    whoAreYou: 'Indemnitor',
    howHeard: 'Google',
    indemnitorName: 'Test User',
    relation: 'Mother',
    indemnitorCell: '(555) 123-4567',
    defendantName: 'Test Defendant',
    defendantDob: '1990-01-01',
    agreeName: 'Test User'
  };
  
  console.log('DEBUG: Test data:', JSON.stringify(testData, null, 2));
  
  try {
    const result = submitToSheet(testData);
    console.log('DEBUG: Test submission successful:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('ERROR: Test submission failed:', error.toString());
    console.error('ERROR: Test stack trace:', error.stack);
    return { success: false, error: error.toString() };
  }
}

/**
 * Test function that simulates a no-cors request (parameters only)
 */
function testNoCorsRequest() {
  console.log('=== DEBUG: Testing no-cors style request ===');
  
  // Simulate what might happen with no-cors mode
  const mockEvent = {
    parameter: {
      timestamp: new Date().toISOString(),
      whoAreYou: 'Indemnitor',
      howHeard: 'Google',
      indemnitorName: 'Test User via no-cors',
      relation: 'Mother',
      indemnitorCell: '(555) 123-4567',
      defendantName: 'Test Defendant',
      defendantDob: '1990-01-01',
      agreeName: 'Test User'
    },
    parameters: {}
  };
  
  console.log('DEBUG: Mock no-cors event:', JSON.stringify(mockEvent, null, 2));
  
  try {
    const result = doPost(mockEvent);
    console.log('DEBUG: No-cors doPost test successful');
    const output = result.getContent();
    console.log('DEBUG: No-cors doPost response:', output);
    return JSON.parse(output);
  } catch (error) {
    console.error('ERROR: No-cors doPost test failed:', error.toString());
    console.error('ERROR: No-cors doPost test stack trace:', error.stack);
    return { success: false, error: error.toString() };
  }
}

/**
 * Test function that simulates a doPost call
 */
function testDoPost() {
  console.log('=== DEBUG: Testing doPost function ===');
  
  // Simulate a typical form submission
  const mockEvent = {
    postData: {
      contents: JSON.stringify({
        timestamp: new Date().toISOString(),
        whoAreYou: 'Indemnitor',
        howHeard: 'Google',
        indemnitorName: 'Test User via doPost',
        relation: 'Mother',
        indemnitorCell: '(555) 123-4567',
        defendantName: 'Test Defendant',
        defendantDob: '1990-01-01',
        agreeName: 'Test User'
      }),
      type: 'application/json'
    },
    parameter: {},
    parameters: {}
  };
  
  console.log('DEBUG: Mock event:', JSON.stringify(mockEvent, null, 2));
  
  try {
    const result = doPost(mockEvent);
    console.log('DEBUG: doPost test successful');
    const output = result.getContent();
    console.log('DEBUG: doPost response:', output);
    return JSON.parse(output);
  } catch (error) {
    console.error('ERROR: doPost test failed:', error.toString());
    console.error('ERROR: doPost test stack trace:', error.stack);
    return { success: false, error: error.toString() };
  }
}