# IDUpload Fix Explanation

## The Problem

The IDUpload form was failing to upload files to Google Drive because of a fundamental limitation with Google Apps Script Web Apps.

### Why bail-bond-application works:
- Sends only **text data** as JSON
- Uses `Content-Type: application/json`
- No file uploads, just form fields
- Google Apps Script easily parses JSON from `e.postData.contents`

### Why IDUpload was failing:
- Tried to send **actual file bytes** using FormData (multipart/form-data)
- Google Apps Script Web Apps **cannot receive file uploads directly**
- The complex iframe submission method was attempting to work around CORS but still couldn't send files
- The .gs script was just creating placeholder text files instead of real uploads

## The Solution

Convert IDUpload to work like bail-bond-application:

1. **Convert files to base64 strings** on the client side
2. **Send everything as JSON** (not FormData)
3. **Decode base64 on the server** and create files in Google Drive

### Files Created:

1. **`scripts/fixed-upload.js`** - Client-side JavaScript that:
   - Converts files to base64 using FileReader API
   - Packages everything as JSON
   - Sends to Google Apps Script using same method as bail-bond-application

2. **`scripts/document-upload-fixed.gs`** - Google Apps Script that:
   - Receives JSON data with base64 files
   - Decodes base64 to binary
   - Creates actual files in Google Drive
   - Updates spreadsheets with file URLs

## How to Deploy

1. **Update Google Apps Script:**
   - Go to your Google Apps Script project
   - Replace the code with `document-upload-fixed.gs`
   - Deploy as Web App
   - Copy the deployment URL

2. **Update index.html:**
   - Add script tag to load `fixed-upload.js`
   - Update the APPS_SCRIPT_URL in fixed-upload.js with your deployment URL

3. **Test:**
   - The form will now convert files to base64 and send as JSON
   - Files will be properly uploaded to Google Drive
   - Spreadsheets will be updated with file links

## Key Limitation

**File size:** Base64 encoding increases data size by ~33%, and Google Apps Script has limits on request size. Keep files under 5MB each for best results.

## Alternative Solutions

If larger files are needed:
1. Use Google Drive API with OAuth (requires authentication)
2. Use a different backend service (Firebase, AWS, etc.)
3. Use Google Forms with file upload capability (requires Google Workspace)