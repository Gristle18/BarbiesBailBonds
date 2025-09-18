/**
 * Script to create a new Google Spreadsheet for storing encoded defendant data
 * Run this once to create the spreadsheet, then use the returned ID in your other scripts
 */

function createEncodedDataSpreadsheet() {
  console.log('🚀 Creating new spreadsheet for encoded data...');
  
  try {
    // Create new spreadsheet
    const spreadsheet = SpreadsheetApp.create('Barbie\'s Bail Bonds - Encoded Defendant Data');
    const sheet = spreadsheet.getActiveSheet();
    
    // Set up headers
    const headers = [
      'Original Row Index',
      'Timestamp', 
      'Indemnitor Name',
      'Defendant Name',
      'Defendant Nickname',
      'Primary Phone',
      'Search Text',
      'Embedding Vector',
      'Source File',
      'Encoded Date'
    ];
    
    // Add headers to sheet
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Format headers
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#f0f0f0');
    headerRange.setBorder(true, true, true, true, true, true);
    
    // Set column widths for better readability
    sheet.setColumnWidth(1, 120);  // Original Row Index
    sheet.setColumnWidth(2, 150);  // Timestamp
    sheet.setColumnWidth(3, 200);  // Indemnitor Name
    sheet.setColumnWidth(4, 200);  // Defendant Name
    sheet.setColumnWidth(5, 150);  // Defendant Nickname
    sheet.setColumnWidth(6, 130);  // Primary Phone
    sheet.setColumnWidth(7, 300);  // Search Text
    sheet.setColumnWidth(8, 100);  // Embedding Vector (will be very long)
    sheet.setColumnWidth(9, 150);  // Source File
    sheet.setColumnWidth(10, 150); // Encoded Date
    
    // Freeze header row
    sheet.setFrozenRows(1);
    
    // Add some sample data row to show the format
    const sampleRow = [
      'Row #',
      'Date/Time',
      'Person who posted bond',
      'Person who was arrested',
      'Nickname',
      'Phone number',
      'Combined searchable text from all fields',
      '[Large JSON array of numbers - embedding vector]',
      'Defendant_Application_2015',
      'Date when encoded'
    ];
    
    sheet.getRange(2, 1, 1, sampleRow.length).setValues([sampleRow]);
    
    // Style the sample row
    const sampleRange = sheet.getRange(2, 1, 1, sampleRow.length);
    sampleRange.setFontStyle('italic');
    sampleRange.setFontColor('#666666');
    
    // Get the spreadsheet ID
    const spreadsheetId = spreadsheet.getId();
    const spreadsheetUrl = spreadsheet.getUrl();
    
    console.log('✅ Spreadsheet created successfully!');
    console.log(`📊 Spreadsheet ID: ${spreadsheetId}`);
    console.log(`🔗 Spreadsheet URL: ${spreadsheetUrl}`);
    
    // Also log the configuration line to copy
    console.log('\n📋 Copy this line to your admin-search.gs CONFIG:');
    console.log(`ENCODED_DATA_SHEET_ID: '${spreadsheetId}',`);
    
    // Return the info
    return {
      id: spreadsheetId,
      url: spreadsheetUrl,
      name: 'Barbie\'s Bail Bonds - Encoded Defendant Data'
    };
    
  } catch (error) {
    console.error('❌ Error creating spreadsheet:', error);
    throw error;
  }
}

/**
 * Test function to verify the spreadsheet was created correctly
 */
function testEncodedSpreadsheet() {
  const info = createEncodedDataSpreadsheet();
  
  console.log('🧪 Testing spreadsheet access...');
  
  try {
    const spreadsheet = SpreadsheetApp.openById(info.id);
    const sheet = spreadsheet.getActiveSheet();
    const data = sheet.getDataRange().getValues();
    
    console.log(`✅ Can access spreadsheet with ${data.length} rows`);
    console.log('Headers:', data[0]);
    
    return true;
  } catch (error) {
    console.error('❌ Error accessing spreadsheet:', error);
    return false;
  }
}