# AdminSearch Deployment Guide

## Current Status
✅ **Encoded data ready**: 4,246 defendant records with OpenAI embeddings
✅ **HTML interface complete**: Search UI with semicolon-delimited queries
✅ **Google Apps Script ready**: RAG search implementation complete
⏳ **Deployment needed**: Upload data & deploy Apps Script

## Step 1: Upload Encoded Data to Google Sheets

1. Open Google Sheets
2. Create a new spreadsheet named "AdminSearch Encoded Data"
3. Import the CSV file:
   - File → Import → Upload → Select `AdminSearch/assets/encoded_defendant_data.csv`
   - Import location: Replace current sheet
   - Separator type: Comma
   - Click "Import data"
4. Copy the spreadsheet ID from the URL:
   - URL format: `https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit`
   - Copy the ID between `/d/` and `/edit`

## Step 2: Deploy Google Apps Script

### 2.1 Create New Apps Script Project
1. Go to https://script.google.com
2. Click "New project"
3. Name it "AdminSearch System"

### 2.2 Add the Code
1. Delete the default code in Code.gs
2. Copy the entire contents of `AdminSearch/scripts/admin-search.gs`
3. Paste it into Code.gs

### 2.3 Update Configuration
1. Find line 22 in the code:
   ```javascript
   ENCODED_DATA_SHEET_ID: 'YOUR_ENCODED_DATA_SHEET_ID_HERE',
   ```
2. Replace with your spreadsheet ID from Step 1:
   ```javascript
   ENCODED_DATA_SHEET_ID: 'your-actual-spreadsheet-id-here',
   ```

### 2.4 Deploy as Web App
1. Click "Deploy" → "New deployment"
2. Configuration:
   - Type: Web app
   - Description: "AdminSearch System"
   - Execute as: Me
   - Who has access: Anyone (or "Anyone with Google account" for security)
3. Click "Deploy"
4. Authorize the app when prompted
5. Copy the Web app URL

## Step 3: Update HTML Interface

1. Open `AdminSearch/index.html`
2. Find line 431:
   ```javascript
   SEARCH_ENDPOINT: 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE',
   ```
3. Replace with your Web app URL from Step 2.4:
   ```javascript
   SEARCH_ENDPOINT: 'https://script.google.com/macros/s/your-deployment-id/exec',
   ```
4. Save the file

## Step 4: Test the System

1. Open `AdminSearch/index.html` in a browser
2. Test searches:
   - Single term: "Jose Delacruz"
   - Phone search: "561-932-9972"
   - Multi-criteria: "Jose; 561-932"
   - Date search: "2018; Delacruz"
   - Complex: "John Smith; 561; 2019"

## Expected Results

### Search Examples
- **"Jose Delacruz"** → Find all records with this name
- **"561-932-9972"** → Find records with this phone number
- **"Jose; 561-932"** → Find records matching both criteria
- **"Government ID; 2024"** → Find Government IDs from 2024

### Response Format
```json
{
  "success": true,
  "query": "Jose Delacruz; 561-932-9972",
  "terms": ["Jose Delacruz", "561-932-9972"],
  "results": [
    {
      "clientName": "Jose Delacruz",
      "phone": "561-932-9972",
      "defendantName": "Jose Delacruz",
      "caseNumber": "BC2018001",
      "timestamp": "2018-03-15T10:30:00Z",
      "documentType": "Defendant Application",
      "overallScore": 0.95,
      "fileUrls": []
    }
  ]
}
```

## Troubleshooting

### "Search endpoint not configured"
- Ensure you've updated the SEARCH_ENDPOINT in index.html

### "OpenAI API key not configured"
- The API key is already in the script (line 9)
- If expired, get a new key from OpenAI

### "Encoded data sheet not found"
- Verify the spreadsheet ID is correct
- Ensure the spreadsheet is not deleted or restricted

### No results returned
- Check that the CSV was imported correctly
- Verify the embedding vectors are in column H
- Test with known data (e.g., "Jose Delacruz")

### CORS errors
- Deploy the Apps Script as "Anyone" not "Only myself"
- Use the exec URL, not the dev URL

## Security Considerations

1. **Access Control**: Consider deploying as "Anyone with Google account"
2. **API Key**: The OpenAI key is embedded - consider using PropertiesService
3. **Data Privacy**: Ensure only authorized staff can access the system
4. **HTTPS**: Always use HTTPS URLs for deployment

## Performance Notes

- Initial search may take 2-3 seconds
- Subsequent searches are faster (cached)
- Can handle 20+ simultaneous searches
- Results limited to top 20 matches by default

## Support

For issues or questions:
- Check the browser console for errors
- Review the Apps Script logs (View → Logs)
- Verify all IDs and URLs are correct
- Test with simpler queries first