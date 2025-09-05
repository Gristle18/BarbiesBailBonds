# RAG System Setup Guide

## Overview
This RAG (Retrieval-Augmented Generation) system provides:
- **Semantic Search** - Understands meaning, not just keywords
- **AI-Powered Responses** - Generates intelligent answers using Gemini
- **Foundation for Chatbot** - Ready to expand into full conversational AI

## Setup Steps

### 1. Get Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/)
2. Create a new API key
3. Copy your API key

### 2. Update Google Apps Script
1. Open your Google Apps Script project
2. Add both `RAG.gs` and updated `FAQ.gs` files
3. In `RAG.gs`, replace `YOUR_GEMINI_API_KEY` with your actual API key:
   ```javascript
   const GEMINI_API_KEY = 'your-actual-api-key-here';
   ```

### 3. Generate Embeddings (One-time setup)
1. In Google Apps Script, run the function: `generateFaqEmbeddings()`
2. This will process all 128+ FAQ items and create vector embeddings
3. Takes ~5-10 minutes due to API rate limits
4. Embeddings are stored in Script Properties for fast access

### 4. Deploy Updated Script
1. Create a new deployment with the RAG-enabled code
2. Get your new deployment URL

## API Endpoints

Once deployed, your Google Apps Script will have these endpoints:

### Semantic Search
```
https://your-script-url/exec?action=search&query=how+much+does+bail+cost&format=jsonp&callback=searchCallback
```

### AI Chat Response
```
https://your-script-url/exec?action=chat&query=what+happens+if+someone+misses+court&format=jsonp&callback=chatCallback
```

### Original FAQ Data
```
https://your-script-url/exec?format=jsonp&callback=faqCallback
```

## Testing

Run `testRAG()` function in Google Apps Script to test:
- Semantic search functionality
- AI response generation
- API connectivity

## Next Steps

After setup, I can:
1. **Update FAQ search** to use semantic search instead of basic text matching
2. **Add AI chatbot interface** for conversational FAQ experience
3. **Enhance responses** with context-aware answers

## Features

✅ **Smart Search** - Finds relevant FAQs even with different wording
✅ **Context-Aware** - Understands related concepts (bail, bond, arrest, court)
✅ **Accurate Responses** - Uses actual FAQ data, not hallucinated info
✅ **JSONP Compatible** - Works with Google Sites embedding
✅ **Scalable** - Easy to add more knowledge sources

## Example Queries That Work Better

- "How much money do I need?" → Finds cost/pricing FAQs
- "Weekend emergency" → Finds 24/7 availability info  
- "Court appearance issues" → Finds missed court date info
- "Foreign citizen arrest" → Finds immigration hold info
- "Payment problems" → Finds payment plan options

The system understands intent and context, not just exact keyword matches!