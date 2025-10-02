/**
 * CheckInProcessor.gs - Google Apps Script for processing defendant check-ins
 * Creates a "Defendant Check Ins" spreadsheet and appends check-in data
 */

// Configuration
const SPREADSHEET_ID = '1734AHsSyrGVOw6f5KG8dJw1Y2dfMKRmtuzPUXxzh8EY';
const FOLDER_ID = '1nr8Gt5QCD-OOLuWwKb5MXS2aepgOydhC';
const SHEET_NAME = 'Sheet1'; // Default sheet name, will use existing sheet

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

  // Separate GPS and IP data
  const gpsData = location.source === 'GPS' ? location : {};
  const ipData = location.source === 'IP' ? location : {};

  // Google Maps link only uses GPS coordinates (more accurate)
  const googleMapsLink = gpsData.latitude && gpsData.longitude ? createGoogleMapsLink(gpsData) : '';

  // Process photo - save to Drive and get shareable link
  const photoInfo = processPhoto(data.photo, data.fullName, formattedTimestamp);

  // Prepare row data
  const rowData = [
    formattedTimestamp,              // A: Timestamp
    data.fullName || '',             // B: Full Name
    locationString,                  // C: Location Summary
    googleMapsLink,                  // D: Google Maps Link
    photoInfo.url || '',             // E: Photo URL
    data.language || 'en',           // F: Language
    data.userAgent || '',            // G: User Agent
    // GPS Data
    gpsData.latitude || '',          // H: GPS Latitude
    gpsData.longitude || '',         // I: GPS Longitude
    gpsData.accuracy || '',          // J: GPS Accuracy
    // IP Data
    ipData.latitude || '',           // K: IP Latitude
    ipData.longitude || '',          // L: IP Longitude
    ipData.city || '',               // M: IP City
    ipData.region || '',             // N: IP Region/State
    ipData.country || '',            // O: IP Country
    location.source || '',           // P: Location Source
    data.timestamp || formattedTimestamp  // Q: Original Timestamp
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
 * Get the specified spreadsheet
 */
function getOrCreateSpreadsheet() {
  try {
    console.log('Using existing spreadsheet:', SPREADSHEET_ID);
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (error) {
    throw new Error('Could not access spreadsheet: ' + error.toString());
  }
}

/**
 * Get or create the sheet within the spreadsheet
 */
function getOrCreateSheet(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  // If Sheet1 doesn't exist, get the first sheet
  if (!sheet) {
    sheet = spreadsheet.getSheets()[0];
  }

  // Check if headers exist, if not, set them up
  if (sheet.getLastRow() === 0) {
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
    'Timestamp',              // A
    'Full Name',              // B
    'Location Summary',       // C
    'Google Maps Link',       // D
    'Photo URL',              // E
    'Language',               // F
    'User Agent',             // G
    'GPS Latitude',           // H
    'GPS Longitude',          // I
    'GPS Accuracy (m)',       // J
    'IP Latitude',            // K
    'IP Longitude',           // L
    'IP City',                // M
    'IP Region/State',        // N
    'IP Country',             // O
    'Location Source',        // P
    'Original Timestamp'      // Q
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
 * Create Google Maps link from location data
 */
function createGoogleMapsLink(location) {
  if (!location || (!location.latitude && !location.longitude)) {
    return '';
  }

  const lat = location.latitude;
  const lng = location.longitude;

  if (!lat || !lng) return '';

  // Create Google Maps link with coordinates
  const baseUrl = 'https://www.google.com/maps/search/';
  const coords = `${lat},${lng}`;

  // Add address if available for better context
  let searchQuery = coords;
  if (location.city && location.region) {
    searchQuery = `${location.city}, ${location.region} ${coords}`;
  }

  return `${baseUrl}${encodeURIComponent(searchQuery)}`;
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

    // Use the specified folder
    const folder = DriveApp.getFolderById(FOLDER_ID);

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
 * Get the specified folder in Google Drive
 */
function getFolder() {
  try {
    return DriveApp.getFolderById(FOLDER_ID);
  } catch (error) {
    throw new Error('Could not access folder: ' + error.toString());
  }
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
    photo: 'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',  // 1x1 pixel test image
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