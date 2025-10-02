# CheckInProcessor.gs - Deployment Instructions

## Overview
This Google Apps Script processes defendant check-in data and stores it in a Google Sheets spreadsheet titled "Defendant Check Ins".

## Features
- **Auto-creates spreadsheet**: Creates "Defendant Check Ins" spreadsheet if it doesn't exist
- **Appends data**: Adds new check-ins to existing spreadsheet (doesn't create new ones)
- **Photo storage**: Saves base64 photos to Google Drive in "Defendant Check In Photos" folder
- **Location tracking**: Records GPS and IP-based location data
- **Bilingual support**: Handles both English and Spanish check-ins

## Deployment Steps

### 1. Create New Google Apps Script Project
1. Go to [script.google.com](https://script.google.com)
2. Click "New Project"
3. Name it "Defendant Check In Processor"

### 2. Add the Script Code
1. Delete the default code in `Code.gs`
2. Copy and paste the entire content of `CheckInProcessor.gs`
3. Save the project (Ctrl+S)

### 3. Deploy as Web App
1. Click "Deploy" → "New deployment"
2. Choose type: "Web app"
3. Configuration:
   - **Description**: "Defendant Check In API"
   - **Execute as**: "Me"
   - **Who has access**: "Anyone"
4. Click "Deploy"
5. **Copy the Web app URL** - you'll need this for the check-in page

### 4. Update Check-In Page
1. Open `CheckIn/index.html`
2. Find the line: `'https://script.google.com/macros/s/YOUR_SCRIPT_ID_HERE/exec'`
3. Replace `YOUR_SCRIPT_ID_HERE` with your actual deployment URL

### 5. Grant Permissions
1. The first time the script runs, it will ask for permissions
2. Allow access to:
   - Google Sheets (to create/write to spreadsheet)
   - Google Drive (to store photos)

## Spreadsheet Structure

The script creates a spreadsheet with these columns:

| Column | Field | Description |
|--------|-------|-------------|
| A | Timestamp | When the check-in was processed |
| B | Full Name | Defendant's full name |
| C | Location Summary | Human-readable location |
| D | Latitude | GPS/IP latitude |
| E | Longitude | GPS/IP longitude |
| F | Accuracy | Location accuracy in meters |
| G | Location Source | GPS or IP |
| H | City | City name (if available) |
| I | Region/State | State/region (if available) |
| J | Country | Country name |
| K | Photo File ID | Google Drive file ID |
| L | Photo URL | Shareable link to photo |
| M | Language | en or es |
| N | User Agent | Browser information |
| O | Original Timestamp | Client-side timestamp |

## Photo Storage

Photos are stored in Google Drive:
- **Folder**: "Defendant Check In Photos"
- **Filename format**: `checkin_[name]_[timestamp].jpg`
- **Permissions**: Viewable by anyone with link
- **Format**: JPEG (converted from base64)

## Testing

Use the `testCheckinProcessor()` function to verify the script works:

1. In the Apps Script editor, select `testCheckinProcessor` function
2. Click "Run"
3. Check that a test spreadsheet and photo are created

## Security Notes

- The script stores all check-in data including photos and location
- Photos are accessible via shareable Google Drive links
- Location data includes both GPS coordinates and IP-based location
- No authentication is required for submissions (anyone can submit)

## Monitoring

- Check execution logs in Google Apps Script for errors
- Monitor the "Defendant Check Ins" spreadsheet for new entries
- Check "Defendant Check In Photos" folder for photo uploads

## Troubleshooting

**Common Issues:**

1. **Permission errors**: Re-run authorization flow
2. **Photo upload fails**: Check base64 format and size limits
3. **Location data missing**: Verify location object structure
4. **Spreadsheet not found**: Script will auto-create on first run

**Error Logs:**
- Check Apps Script execution transcript for detailed error messages
- All errors are logged with timestamps for debugging