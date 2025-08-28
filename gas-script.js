/**
 * Google Apps Script for Barbie's Bail Bonds Application Form
 * This script receives form data and stores it in Google Sheets
 */

function doGet() {
  return HtmlService.createTemplateFromFile('bail-bond-application')
    .evaluate()
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function submitToSheet(formData) {
  try {
    // Get or create the spreadsheet
    const spreadsheetId = '1234567890abcdefghijklmnopqrstuvwxyz'; // Replace with your actual spreadsheet ID
    let spreadsheet;
    
    try {
      spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    } catch (e) {
      // If spreadsheet doesn't exist, create a new one
      spreadsheet = SpreadsheetApp.create('Barbie\'s Bail Bonds Applications');
      console.log('Created new spreadsheet with ID:', spreadsheet.getId());
    }
    
    // Get or create the main sheet
    let sheet = spreadsheet.getSheetByName('Applications');
    if (!sheet) {
      sheet = spreadsheet.insertSheet('Applications');
      
      // Add headers
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
      
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    
    // Prepare row data
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
    
    // Add the data to the sheet
    sheet.appendRow(rowData);
    
    // Auto-resize columns
    sheet.autoResizeColumns(1, rowData.length);
    
    // Send email notification (optional)
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
    } catch (emailError) {
      console.log('Email notification failed:', emailError);
      // Don't fail the whole submission if email fails
    }
    
    return { success: true, message: 'Application submitted successfully!' };
    
  } catch (error) {
    console.error('Error submitting to sheet:', error);
    throw new Error('Failed to submit application. Please try again or call us directly.');
  }
}

/**
 * Test function to verify the script works
 */
function testSubmission() {
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
  
  try {
    const result = submitToSheet(testData);
    console.log('Test submission result:', result);
  } catch (error) {
    console.error('Test submission failed:', error);
  }
}