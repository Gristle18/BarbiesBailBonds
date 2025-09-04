Google Apps Script: File Upload Endpoint
=======================================

This guide sets up a Google Apps Script Web App to receive `multipart/form-data` from the `IDUpload` page and store files in Google Drive, plus log metadata to a Google Sheet.

What You’ll Get
---------------
- Web endpoint (HTTPS) you can paste into `IDUpload/scripts/config.js`
- Uploaded files saved to a Drive folder
- A spreadsheet row for each submission (time, names, phones, file links)

Prerequisites
-------------
- Google account with access to Google Drive
- Optional: a Google Sheet created to log submissions

Step 1: Create Drive Folder and (Optional) Spreadsheet
-----------------------------------------------------
1) Create a folder in Google Drive, e.g. “BarbiesBailBonds Uploads”.
   - Copy its Folder ID from the URL (the long string after `folders/`).
2) (Optional) Create a Google Sheet named “ID Upload Log”.
   - Add header row in Sheet1: Timestamp | Your Name | Your Phone | Defendant Name | Case/Booking | ID Front | ID Back | Docs
   - Copy the Sheet ID from the URL (the long string in `/d/…/edit`).

Step 2: Create a New Apps Script Project
---------------------------------------
1) Go to https://script.google.com/ and create a new project.
2) Replace the default Code.gs content with the script below.
3) In the left sidebar, open Project Settings and add two Script Properties:
   - `FOLDER_ID` = your Drive folder ID
   - `SHEET_ID` = your Sheet ID (optional; leave blank to skip logging)

Code.gs (Paste This)
--------------------
```javascript
function doPost(e) {
  try {
    // Basic CORS (note: ContentService has limited header control; use no-cors on client)
    var output = handleUpload_(e);
    return ContentService.createTextOutput(JSON.stringify(output))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleUpload_(e) {
  if (!e || !e.parameters) throw new Error('No payload');

  var props = PropertiesService.getScriptProperties();
  var folderId = props.getProperty('FOLDER_ID');
  if (!folderId) throw new Error('Missing FOLDER_ID Script Property');
  var parentFolder = DriveApp.getFolderById(folderId);

  // Create a subfolder per submission
  var ts = new Date();
  var stamp = Utilities.formatDate(ts, Session.getScriptTimeZone(), 'yyyy-MM-dd_HH-mm-ss');
  var sub = parentFolder.createFolder('upload_' + stamp);

  // Extract form fields
  var p = e.parameters;
  // Note: for multipart/form-data, file fields arrive in e.files
  var yourName = (p.yourName && p.yourName[0]) || '';
  var yourPhone = (p.yourPhone && p.yourPhone[0]) || '';
  var defendantName = (p.defendantName && p.defendantName[0]) || '';
  var caseNumber = (p.caseNumber && p.caseNumber[0]) || '';

  // Save files
  var links = { idFront: '', idBack: '', docs: [] };
  if (e.files) {
    // idFront
    if (e.files.idFront) {
      var f1 = e.files.idFront;
      var file1 = sub.createFile(f1); // Blob
      file1.setName('idFront_' + (f1.filename || file1.getId()));
      links.idFront = file1.getUrl();
    }
    // idBack
    if (e.files.idBack) {
      var f2 = e.files.idBack;
      var file2 = sub.createFile(f2);
      file2.setName('idBack_' + (f2.filename || file2.getId()));
      links.idBack = file2.getUrl();
    }
    // docs[] (multiple)
    var idx = 0;
    while (true) {
      var key = 'docs[' + idx + ']';
      if (!e.files[key]) break;
      var fd = e.files[key];
      var fdFile = sub.createFile(fd);
      fdFile.setName('doc_' + idx + '_' + (fd.filename || fdFile.getId()));
      links.docs.push(fdFile.getUrl());
      idx++;
    }
    // Some browsers send just 'docs' if single file
    if (links.docs.length === 0 && e.files.docs) {
      var fdSingle = e.files.docs;
      var fdFile2 = sub.createFile(fdSingle);
      fdFile2.setName('doc_0_' + (fdSingle.filename || fdFile2.getId()));
      links.docs.push(fdFile2.getUrl());
    }
  }

  // Log to Sheet (optional)
  var sheetId = props.getProperty('SHEET_ID');
  if (sheetId) {
    var ss = SpreadsheetApp.openById(sheetId);
    var sh = ss.getSheets()[0];
    sh.appendRow([
      new Date(), yourName, yourPhone, defendantName, caseNumber,
      links.idFront, links.idBack, links.docs.join('\n')
    ]);
  }

  return { ok: true, folder: sub.getUrl(), links: links };
}
```

Step 3: Deploy as Web App
-------------------------
1) Click Deploy → Manage deployments → New deployment.
2) Select “Web app”.
3) Set “Who has access” to “Anyone” or “Anyone with the link”.
4) Deploy and copy the Web App URL (ends with `/exec`).

Step 4: Configure the Frontend
-------------------------------
1) In the repo, copy `IDUpload/scripts/config.example.js` to `IDUpload/scripts/config.js`.
2) Set:
   ```js
   window.UPLOAD_ENDPOINT = 'PASTE_YOUR_APPS_SCRIPT_EXEC_URL_HERE';
   ```
3) The IDUpload page already loads `scripts/config.js` before `upload.js`.
4) No other changes required. The uploader uses `fetch(..., { mode: 'no-cors' })` so you don’t need CORS headers.

Verification
------------
- Open `IDUpload/index.html` in a browser.
- Fill required fields and upload a small image/PDF.
- Submit. The page will show success (cannot read response in no-cors, but files should appear in Drive and row in Sheet if configured).

Notes & Limits
--------------
- Apps Script has execution and file size limits; keep files ≤ 10MB each (enforced client-side).
- If you later host behind a domain that supports CORS with proper headers, you can remove `mode: 'no-cors'` to read JSON responses.

