/**
 * CheckInProcessor.gs - Google Apps Script for processing defendant check-ins
 * Creates a "Defendant Check Ins" spreadsheet and appends check-in data
 */

// Configuration
const SPREADSHEET_NAME = 'Defendant Check Ins';
const SHEET_NAME = 'Check In Records';

/**
 * Main entry point for web requests
 */
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    // Set CORS headers
    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);

    // Handle preflight OPTIONS request
    if (e.parameter.method === 'OPTIONS') {
      return output.setContent(JSON.stringify({success: true}));
    }

    // Parse the request data
    const data = parseRequestData(e);

    if (!data) {
      throw new Error('No data received');
    }

    // Validate required fields
    if (!data.fullName || !data.photo || !data.location) {
      throw new Error('Missing required fields: fullName, photo, or location');
    }

    // Process the check-in
    const result = processCheckin(data);

    return output.setContent(JSON.stringify({
      success: true,
      message: 'Check-in recorded successfully',
      rowNumber: result.rowNumber,
      timestamp: result.timestamp
    }));

  } catch (error) {
    console.error('Error processing check-in:', error);

    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString(),
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Parse request data from various sources
 */
function parseRequestData(e) {
  let data = null;

  // Try to get data from POST body
  if (e.postData && e.postData.contents) {
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseError) {
      console.log('Failed to parse POST data:', parseError);
    }
  }

  // Fallback to URL parameters
  if (!data && e.parameter) {
    data = e.parameter;

    // Parse JSON strings in parameters
    ['location', 'photo'].forEach(field => {
      if (data[field] && typeof data[field] === 'string') {
        try {
          data[field] = JSON.parse(data[field]);
        } catch (parseError) {
          console.log(`Failed to parse ${field}:`, parseError);
        }
      }
    });
  }

  return data;
}

/**
 * Process check-in data and store in spreadsheet
 */
function processCheckin(data) {
  // Get or create the spreadsheet
  const spreadsheet = getOrCreateSpreadsheet();
  const sheet = getOrCreateSheet(spreadsheet);

  // Prepare the row data
  const timestamp = new Date();
  const formattedTimestamp = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

  // Process location data
  const location = data.location || {};
  const locationString = formatLocationString(location);

  // Process photo - save to Drive and get shareable link
  const photoInfo = processPhoto(data.photo, data.fullName, formattedTimestamp);

  // Prepare row data
  const rowData = [
    formattedTimestamp,              // A: Timestamp
    data.fullName || '',             // B: Full Name
    locationString,                  // C: Location (formatted)
    location.latitude || '',         // D: Latitude
    location.longitude || '',        // E: Longitude
    location.accuracy || '',         // F: Accuracy
    location.source || '',           // G: Location Source (GPS/IP)
    location.city || '',             // H: City
    location.region || '',           // I: Region/State
    location.country || '',          // J: Country
    photoInfo.fileId || '',          // K: Photo File ID
    photoInfo.url || '',             // L: Photo URL
    data.language || 'en',           // M: Language
    data.userAgent || '',            // N: User Agent
    data.timestamp || formattedTimestamp  // O: Original Timestamp
  ];

  // Append the row
  sheet.appendRow(rowData);

  // Get the row number
  const rowNumber = sheet.getLastRow();

  console.log(`Check-in recorded for ${data.fullName} at row ${rowNumber}`);

  return {
    rowNumber: rowNumber,
    timestamp: formattedTimestamp,
    photoUrl: photoInfo.url
  };
}

/**
 * Get or create the spreadsheet
 */
function getOrCreateSpreadsheet() {
  // Try to find existing spreadsheet
  const files = DriveApp.getFilesByName(SPREADSHEET_NAME);

  if (files.hasNext()) {
    const file = files.next();
    console.log('Using existing spreadsheet:', file.getId());
    return SpreadsheetApp.openById(file.getId());
  }

  // Create new spreadsheet
  console.log('Creating new spreadsheet:', SPREADSHEET_NAME);
  const spreadsheet = SpreadsheetApp.create(SPREADSHEET_NAME);

  // Set up the initial sheet
  setupInitialSheet(spreadsheet);

  return spreadsheet;
}

/**
 * Get or create the sheet within the spreadsheet
 */
function getOrCreateSheet(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    setupSheetHeaders(sheet);
  }

  return sheet;
}

/**
 * Set up the initial spreadsheet structure
 */
function setupInitialSheet(spreadsheet) {
  // Rename the default sheet
  const defaultSheet = spreadsheet.getSheets()[0];
  defaultSheet.setName(SHEET_NAME);

  // Set up headers
  setupSheetHeaders(defaultSheet);
}

/**
 * Set up sheet headers
 */
function setupSheetHeaders(sheet) {
  const headers = [
    'Timestamp',
    'Full Name',
    'Location Summary',
    'Latitude',
    'Longitude',
    'Accuracy (meters)',
    'Location Source',
    'City',
    'Region/State',
    'Country',
    'Photo File ID',
    'Photo URL',
    'Language',
    'User Agent',
    'Original Timestamp'
  ];

  // Set headers
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Format headers
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#f0f0f0');

  // Auto-resize columns
  for (let i = 1; i <= headers.length; i++) {
    sheet.autoResizeColumn(i);
  }

  console.log('Sheet headers set up successfully');
}

/**
 * Format location data into a readable string
 */
function formatLocationString(location) {
  if (!location) return 'No location data';

  const parts = [];

  if (location.city) parts.push(location.city);
  if (location.region) parts.push(location.region);
  if (location.country) parts.push(location.country);

  let locationStr = parts.length > 0 ? parts.join(', ') : '';

  if (location.latitude && location.longitude) {
    const coords = `(${parseFloat(location.latitude).toFixed(6)}, ${parseFloat(location.longitude).toFixed(6)})`;
    locationStr = locationStr ? `${locationStr} ${coords}` : coords;
  }

  if (location.source) {
    locationStr += ` [${location.source}]`;
  }

  return locationStr || 'Location data available';
}

/**
 * Process and store photo in Google Drive
 */
function processPhoto(photoData, fullName, timestamp) {
  try {
    if (!photoData || !photoData.startsWith('data:image/')) {
      throw new Error('Invalid photo data');
    }

    // Parse the base64 data
    const mimeType = photoData.split(';')[0].split(':')[1];
    const base64Data = photoData.split(',')[1];

    // Convert base64 to blob
    const blob = Utilities.newBlob(
      Utilities.base64Decode(base64Data),
      mimeType,
      `checkin_${sanitizeFilename(fullName)}_${timestamp.replace(/[:\s]/g, '-')}.jpg`
    );

    // Create or get the check-ins folder
    const folder = getOrCreateFolder('Defendant Check In Photos');

    // Save the file
    const file = folder.createFile(blob);

    // Make the file viewable by anyone with the link
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    console.log('Photo saved:', file.getName());

    return {
      fileId: file.getId(),
      url: file.getUrl(),
      name: file.getName()
    };

  } catch (error) {
    console.error('Error processing photo:', error);
    return {
      fileId: '',
      url: '',
      name: '',
      error: error.toString()
    };
  }
}

/**
 * Get or create a folder in Google Drive
 */
function getOrCreateFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);

  if (folders.hasNext()) {
    return folders.next();
  }

  console.log('Creating folder:', folderName);
  return DriveApp.createFolder(folderName);
}

/**
 * Sanitize filename for Google Drive
 */
function sanitizeFilename(filename) {
  return filename
    .replace(/[^a-zA-Z0-9\s\-_]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);
}

/**
 * Test function to verify the script works
 */
function testCheckinProcessor() {
  const testData = {
    fullName: 'Test User',
    photo: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAAAA...',  // Truncated for brevity
    location: {
      latitude: 26.7153,
      longitude: -80.0534,
      accuracy: 10,
      source: 'GPS',
      city: 'West Palm Beach',
      region: 'Florida',
      country: 'United States'
    },
    language: 'en',
    userAgent: 'Test User Agent',
    timestamp: new Date().toISOString()
  };

  try {
    const result = processCheckin(testData);
    console.log('Test successful:', result);
    return result;
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
}