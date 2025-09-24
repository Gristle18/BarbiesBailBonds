# Google Apps Script Deployment Instructions

## Overview
You now have three separate Google Apps Script files that can be deployed as independent projects:

1. **FAQ-OpenAI.gs** - FAQ API with semantic search (stateless)
2. **RAG-OpenAI.gs** - Embeddings and semantic search engine
3. **ChatBot-OpenAI.gs** - Stateful chatbot with conversation memory

## Prerequisites

### Get OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Go to API Keys section
4. Create a new API key
5. Save it securely

## Deployment Option 1: Combined FAQ + RAG System

### Step 1: Create New Google Apps Script Project
1. Go to [script.google.com](https://script.google.com)
2. Click "New Project"
3. Name it "BarbiesBailBonds-FAQ-System"

### Step 2: Add Files
1. Copy contents of `FAQ-OpenAI.gs` into `Code.gs` (rename it to `FAQ.gs`)
2. Click "+" next to Files → "Script"
3. Name it "RAG" and paste contents of `RAG-OpenAI.gs`

### Step 3: Configure API Key
1. Click gear icon (Project Settings)
2. Scroll to "Script Properties"
3. Add property:
   - Name: `OPENAI_API_KEY`
   - Value: `your-openai-api-key-here`

### Step 4: Initialize System
1. In the editor, select `setupRAGSystem` function
2. Click "Run"
3. Grant permissions when prompted
4. Check logs for confirmation

### Step 5: Generate Embeddings
1. Select `generateFaqEmbeddings` function
2. Click "Run" (this will take 5-10 minutes)
3. A Google Sheet named "FAQ_Embeddings_OpenAI" will be created

### Step 6: Deploy as Web App
1. Click "Deploy" → "New Deployment"
2. Type: "Web app"
3. Description: "FAQ API with Semantic Search"
4. Execute as: "Me"
5. Who has access: "Anyone"
6. Click "Deploy"
7. Copy the Web App URL

### FAQ System Endpoints:
```
# Get all FAQs as JSON
https://script.google.com/.../exec?format=json

# Get FAQs as JSONP (for Google Sites)
https://script.google.com/.../exec?format=jsonp&callback=handleFAQ

# Semantic search
https://script.google.com/.../exec?action=search&query=bail+cost

# Simple Q&A (no memory)
https://script.google.com/.../exec?action=ask&query=how+much+for+5000+bond
```

## Deployment Option 2: Standalone Chatbot with Memory

### Step 1: Create New Project
1. Go to [script.google.com](https://script.google.com)
2. Click "New Project"
3. Name it "BarbiesBailBonds-Chatbot"

### Step 2: Add ChatBot Code
1. Copy contents of `ChatBot-OpenAI.gs` into `Code.gs`

### Step 3: Configure API Key
1. Click gear icon (Project Settings)
2. Add Script Property:
   - Name: `OPENAI_API_KEY`
   - Value: `your-openai-api-key-here`

### Step 4: Deploy
1. Click "Deploy" → "New Deployment"
2. Type: "Web app"
3. Description: "Chatbot with Memory"
4. Execute as: "Me"
5. Who has access: "Anyone"
6. Click "Deploy"
7. Copy the Web App URL

### Chatbot Endpoints:
```
# Start new chat session
https://script.google.com/.../exec?action=new_session&user_id=user123

# Send message (with session)
https://script.google.com/.../exec?action=chat&message=Hello&session_id=xxx-xxx

# Get conversation history
https://script.google.com/.../exec?action=get_history&session_id=xxx-xxx

# Get session stats
https://script.google.com/.../exec?action=stats&session_id=xxx-xxx

# Clear session
https://script.google.com/.../exec?action=clear_session&session_id=xxx-xxx

# JSONP support for all endpoints
https://script.google.com/.../exec?action=chat&message=Hi&session_id=xxx&format=jsonp&callback=handleResponse
```

## Session Management

### How Sessions Work:
- **Session ID**: Unique identifier for each conversation
- **User ID**: Optional identifier for the user
- **Duration**: Sessions persist for 24 hours by default
- **Storage**: Uses CacheService (6 hours) + PropertiesService (24 hours)
- **History**: Keeps last 20 messages per session

### Client Implementation Example:
```javascript
// Initialize chatbot
let sessionId = localStorage.getItem('chatbot_session');
if (!sessionId) {
  // Create new session
  fetch(CHATBOT_URL + '?action=new_session&user_id=' + userId)
    .then(r => r.json())
    .then(data => {
      sessionId = data.session_id;
      localStorage.setItem('chatbot_session', sessionId);
    });
}

// Send message
function sendMessage(message) {
  const url = CHATBOT_URL + '?action=chat' +
    '&message=' + encodeURIComponent(message) +
    '&session_id=' + sessionId;

  fetch(url)
    .then(r => r.json())
    .then(data => {
      console.log('Bot response:', data.response);
      console.log('Message count:', data.message_count);
    });
}
```

## Testing

### Test FAQ System:
```javascript
// Run in Apps Script Editor
function testRAG() {
  // This function is included in RAG-OpenAI.gs
  // It will test semantic search and responses
}
```

### Test Chatbot:
```javascript
// Run in Apps Script Editor
function testChatbot() {
  // This function is included in ChatBot-OpenAI.gs
  // It will simulate a conversation
}
```

## Integration with Your Website

### For Google Sites:
```html
<!-- FAQ Search Widget -->
<script>
function searchFAQ(query) {
  const script = document.createElement('script');
  script.src = FAQ_URL + '?action=search&query=' + query +
    '&format=jsonp&callback=displayResults';
  document.body.appendChild(script);
}

function displayResults(data) {
  console.log('Search results:', data.results);
}
</script>

<!-- Chatbot Widget -->
<script>
let chatSession = null;

function initChat() {
  const script = document.createElement('script');
  script.src = CHATBOT_URL + '?action=new_session&user_id=web_user' +
    '&format=jsonp&callback=startChat';
  document.body.appendChild(script);
}

function startChat(data) {
  chatSession = data.session_id;
  console.log('Chat session started:', chatSession);
}

function sendChat(message) {
  const script = document.createElement('script');
  script.src = CHATBOT_URL + '?action=chat&message=' + encodeURIComponent(message) +
    '&session_id=' + chatSession + '&format=jsonp&callback=receiveMessage';
  document.body.appendChild(script);
}

function receiveMessage(data) {
  console.log('Bot:', data.response);
  // Display in your UI
}

// Initialize on page load
window.onload = initChat;
</script>
```

## Monitoring & Maintenance

### View Logs:
1. In Apps Script Editor, click "Executions" (clock icon)
2. View execution history and logs

### Update Embeddings:
Run `generateFaqEmbeddings()` whenever you update FAQ data

### Monitor Usage:
- Check OpenAI dashboard for API usage
- Review Google Sheets for embedding data
- Monitor Apps Script quotas

### Session Cleanup:
Sessions auto-expire after 24 hours. Manual cleanup:
```javascript
function cleanupAllSessions() {
  const properties = PropertiesService.getUserProperties();
  const all = properties.getProperties();
  Object.keys(all).forEach(key => {
    if (key.startsWith('session_')) {
      properties.deleteProperty(key);
    }
  });
}
```

## Cost Optimization

### OpenAI Costs:
- **Embeddings**: ~$0.00002 per 1K tokens (one-time for FAQs)
- **GPT-4o-mini**: ~$0.00015 per 1K input tokens
- **Estimated**: <$5/month for moderate usage

### Tips:
1. Cache embeddings in Google Sheets (done automatically)
2. Use GPT-4o-mini instead of GPT-4 for lower costs
3. Implement rate limiting if needed
4. Monitor usage via OpenAI dashboard

## Troubleshooting

### "API Key not found":
- Check Script Properties for OPENAI_API_KEY
- Ensure no extra spaces in the key

### "Embeddings not found":
- Run `generateFaqEmbeddings()` first
- Check for "FAQ_Embeddings_OpenAI" spreadsheet in Google Drive

### "Session not persisting":
- Check browser localStorage for session_id
- Verify CacheService quotas not exceeded
- Sessions expire after 24 hours

### "CORS errors":
- Use JSONP format for cross-domain requests
- Or set up proper CORS headers in your domain

## Security Notes

1. **API Keys**: Never expose OpenAI keys in client-side code
2. **Rate Limiting**: Implement if publicly exposed
3. **Input Validation**: The scripts validate input lengths
4. **Access Control**: Set "Who has access" appropriately
5. **Session Security**: Session IDs are UUIDs, difficult to guess

## Support

For the Google Apps Script platform:
- [Apps Script Documentation](https://developers.google.com/apps-script)
- [Quotas and Limits](https://developers.google.com/apps-script/guides/services/quotas)

For OpenAI:
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Pricing](https://openai.com/pricing)