# Google Sheets Setup Instructions for Bail Bond Application

## Overview
This guide will help you connect your bail bond application form to Google Sheets using Google Apps Script.

## Step 1: Create a Google Apps Script Project

1. Go to [Google Apps Script](https://script.google.com)
2. Click "New Project"
3. Replace the default code with the contents of `gas-script.js`
4. Rename the project to "Barbie's Bail Bonds Form Handler"

## Step 2: Deploy as Web App

1. In the Apps Script editor, click "Deploy" → "New deployment"
2. Choose type: "Web app"
3. Set the following:
   - Description: "Bail Bond Form Handler"
   - Execute as: "Me"
   - Who has access: "Anyone"
4. Click "Deploy"
5. Copy the Web App URL (you'll need this)

## Step 3: Update the HTML Form

1. Open `bail-bond-application.html`
2. Find line 864 where it checks for `google.script.run`
3. The form is already set up to work with Google Apps Script
4. When you deploy the HTML file via Google Apps Script, it will automatically work

## Step 4: Host the Form via Google Apps Script

### Option A: Deploy HTML through Apps Script (Recommended)
1. In your Apps Script project, create a new HTML file called "bail-bond-application"
2. Copy the entire contents of `bail-bond-application.html` into this file
3. The `doGet()` function in the script will serve this HTML
4. Use the Web App URL from Step 2 to access your form

### Option B: Host HTML separately and use Web App as API
1. If you want to host the HTML elsewhere, modify the form submission code
2. Replace the `google.script.run` section with a fetch request to your Web App URL
3. You'll need to handle CORS if hosting on a different domain

## Step 5: Set Up Google Sheet

1. The script will automatically create a new Google Sheet named "Barbie's Bail Bonds Applications"
2. Alternatively, you can:
   - Create your own Google Sheet
   - Copy the Sheet ID from the URL
   - Replace line 18 in `gas-script.js` with your Sheet ID

## Step 6: Configure Email Notifications (Optional)

1. In `gas-script.js`, find line 158: `const notificationEmail = 'admin@barbiesbailbonds.com';`
2. Replace with your actual email address
3. You'll receive an email for each new application

## Step 7: Test the Setup

1. Use the `testSubmission()` function in the Apps Script editor
2. Run it to verify the sheet connection works
3. Check that a test row appears in your Google Sheet

## Important Security Notes

- The Apps Script runs under your Google account
- Keep the Web App URL secure
- Consider adding additional validation if needed
- All form data will be stored in your Google Drive

## Troubleshooting

### If the form doesn't submit:
1. Check the browser console for errors
2. Verify the Apps Script deployment is active
3. Ensure the Google Sheet has proper permissions

### If emails don't send:
1. Check that Gmail API is enabled
2. Verify the email address is correct
3. Check Apps Script execution logs

## File Structure

```
BarbiesBailBonds/
├── bail-bond-application.html (your form)
├── gas-script.js (copy this to Google Apps Script)
└── GOOGLE_SHEETS_SETUP.md (this file)
```

## Next Steps

1. Follow the steps above to deploy your form
2. Test with sample data
3. Share the Web App URL with users
4. Monitor submissions in your Google Sheet

The form is now ready to automatically save all submissions to Google Sheets with proper formatting and email notifications.