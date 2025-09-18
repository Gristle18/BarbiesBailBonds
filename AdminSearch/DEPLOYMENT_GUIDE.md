# AdminSearch Deployment Guide

## Current Status
✅ **Encoded data ready**: 4,246 defendant records with OpenAI embeddings
✅ **Data split into 3 files**: Each under 65MB for Google Sheets compatibility
✅ **HTML interface complete**: Search UI with semicolon-delimited queries
✅ **Google Apps Script updated**: Multi-sheet search implementation ready
⏳ **Deployment needed**: Upload data & deploy Apps Script

## Step 1: Upload Encoded Data to Google Sheets

### Important: The data has been split into 3 parts due to size limitations

### 1.1 Upload Part 1 (Rows 1-1,500)
1. Open Google Sheets
2. Create a new spreadsheet named "AdminSearch Data Part 1"
3. Import the CSV file:
   - File → Import → Upload → Select `AdminSearch/assets/encoded_defendant_data_part1.csv`
   - Import location: Replace current sheet
   - Separator type: Comma
   - Click "Import data"
4. Copy the spreadsheet ID from the URL (save for later)

### 1.2 Upload Part 2 (Rows 1,501-3,000)
1. Create another new spreadsheet named "AdminSearch Data Part 2"
2. Import: `AdminSearch/assets/encoded_defendant_data_part2.csv`
3. Use same import settings as above
4. Copy the spreadsheet ID (save for later)

### 1.3 Upload Part 3 (Rows 3,001-4,246)
1. Create another new spreadsheet named "AdminSearch Data Part 3"
2. Import: `AdminSearch/assets/encoded_defendant_data_part3.csv`
3. Use same import settings as above
4. Copy the spreadsheet ID (save for later)

## Step 2: Deploy Google Apps Script

### 2.1 Create New Apps Script Project
1. Go to https://script.google.com
2. Click "New project"
3. Name it "AdminSearch System"

### 2.2 Add the Code
1. Delete the default code in Code.gs
2. Copy the entire contents of `AdminSearch/scripts/admin-search-multi.gs`
3. Paste it into Code.gs

### 2.3 Update Configuration
1. Find lines 15-19 in the code:
   ```javascript
   ENCODED_DATA_SHEET_IDS: [
     'YOUR_PART1_SHEET_ID_HERE', // Replace with Part 1 sheet ID
     'YOUR_PART2_SHEET_ID_HERE', // Replace with Part 2 sheet ID
     'YOUR_PART3_SHEET_ID_HERE'  // Replace with Part 3 sheet ID
   ],
   ```
2. Replace with your three spreadsheet IDs from Step 1:
   ```javascript
   ENCODED_DATA_SHEET_IDS: [
     'your-part1-sheet-id',
     'your-part2-sheet-id',
     'your-part3-sheet-id'
   ],
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

## File Sizes
- **Part 1**: 61MB (1,500 records)
- **Part 2**: 61MB (1,500 records)
- **Part 3**: 51MB (1,246 records)
- **Total**: 4,246 records across 3 sheets

## Troubleshooting

### "Search endpoint not configured"
- Ensure you've updated the SEARCH_ENDPOINT in index.html

### "OpenAI API key not configured"
- The API key is already in the script (line 10)
- If expired, get a new key from OpenAI

### "Encoded data sheet not found"
- Verify all three spreadsheet IDs are correct
- Ensure none of the spreadsheets are deleted or restricted
- Check that you replaced all three placeholder IDs

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