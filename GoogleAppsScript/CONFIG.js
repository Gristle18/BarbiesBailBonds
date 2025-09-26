/**
 * CONFIG.js - Central configuration file for all Google Apps Script deployments
 * Update these URLs whenever you redeploy the scripts
 * Last Updated: 2025-09-24
 */

const DEPLOYMENT_CONFIG = {
  // ============================================
  // PRODUCTION DEPLOYMENT URLs
  // ============================================

  /**
   * RAG System Deployment (RAG-OpenAI.gs)
   * Handles: FAQ data, semantic search, chat, Q&A, embeddings
   * Script: RAG-OpenAI.gs
   * This single deployment handles all FAQ and search functionality
   */
  RAG_API_URL: 'https://script.google.com/macros/s/AKfycbwK8UXXlwI1mmGT_Qlae2IoyJna1k7lGxL6544IsSEyqeFaR4hgimyteD1r71o9RQoq/exec',

  /**
   * ChatBot Deployment
   * Handles: Stateful conversations with memory
   * Script: ChatBot-OpenAI.gs
   */
  CHATBOT_API_URL: 'https://script.google.com/macros/s/AKfycbyGCUEPREo_YNA5ckb07lHoGT2BOaRVLywuS7FjH1sq74lP5OvNhjOpbb_fbBMu36fQ/exec',

  // ============================================
  // API CONFIGURATION
  // ============================================

  /**
   * OpenAI Configuration
   * Note: API keys are stored in Script Properties, not here
   */
  OPENAI: {
    EMBEDDING_MODEL: 'text-embedding-3-small',
    CHAT_MODEL: 'gpt-4o-mini',
    MAX_TOKENS: 500,
    TEMPERATURE: 0.7
  },

  // ============================================
  // SESSION CONFIGURATION
  // ============================================

  SESSION: {
    DURATION_HOURS: 24,
    MAX_HISTORY_LENGTH: 20,
    CACHE_DURATION_SECONDS: 21600 // 6 hours
  },

  // ============================================
  // STORAGE CONFIGURATION
  // ============================================

  STORAGE: {
    EMBEDDINGS_SPREADSHEET_NAME: 'FAQ_Embeddings_OpenAI',
    FAQ_COUNT: 229
  }
};

// ============================================
// HELPER FUNCTIONS FOR CLIENT INTEGRATION
// ============================================

/**
 * Get FAQ data
 */
function getFAQUrl(format = 'json', callback = null) {
  let url = DEPLOYMENT_CONFIG.RAG_API_URL + '?action=list&format=' + format;
  if (callback && format === 'jsonp') {
    url += '&callback=' + callback;
  }
  return url;
}

/**
 * Search FAQs with semantic search
 */
function getSearchUrl(query, format = 'json', callback = null) {
  let url = DEPLOYMENT_CONFIG.RAG_API_URL +
    '?action=search&query=' + encodeURIComponent(query) +
    '&format=' + format;
  if (callback && format === 'jsonp') {
    url += '&callback=' + callback;
  }
  return url;
}

/**
 * Ask a question (stateless)
 */
function getAskUrl(question, format = 'json', callback = null) {
  let url = DEPLOYMENT_CONFIG.RAG_API_URL +
    '?action=ask&query=' + encodeURIComponent(question) +
    '&format=' + format;
  if (callback && format === 'jsonp') {
    url += '&callback=' + callback;
  }
  return url;
}

/**
 * Chat with bot (stateful with memory)
 */
function getChatUrl(message, sessionId, format = 'json', callback = null) {
  let url = DEPLOYMENT_CONFIG.CHATBOT_API_URL +
    '?action=chat&message=' + encodeURIComponent(message) +
    '&session_id=' + sessionId +
    '&format=' + format;
  if (callback && format === 'jsonp') {
    url += '&callback=' + callback;
  }
  return url;
}

/**
 * Create new chat session
 */
function getNewSessionUrl(userId = 'anonymous', format = 'json', callback = null) {
  let url = DEPLOYMENT_CONFIG.CHATBOT_API_URL +
    '?action=new_session&user_id=' + userId +
    '&format=' + format;
  if (callback && format === 'jsonp') {
    url += '&callback=' + callback;
  }
  return url;
}

// ============================================
// EXAMPLE USAGE IN YOUR WEBSITE
// ============================================

/*
// Example 1: Get all FAQ data
fetch(getFAQUrl())
  .then(r => r.json())
  .then(data => console.log(data));

// Example 2: Search FAQs
fetch(getSearchUrl('bail cost'))
  .then(r => r.json())
  .then(data => console.log(data.results));

// Example 3: Start chat session
fetch(getNewSessionUrl('user123'))
  .then(r => r.json())
  .then(data => {
    const sessionId = data.session_id;
    // Now use sessionId for chat messages
    return fetch(getChatUrl('Hello', sessionId));
  })
  .then(r => r.json())
  .then(data => console.log('Bot:', data.response));

// Example 3: JSONP for Google Sites
const script = document.createElement('script');
script.src = getSearchUrl('weekend hours', 'jsonp', 'handleResults');
document.body.appendChild(script);

function handleResults(data) {
  console.log('Search results:', data.results);
}
*/

// ============================================
// DEPLOYMENT CHECKLIST
// ============================================

/*
BEFORE USING ANY DEPLOYMENT:

1. ✅ Add OPENAI_API_KEY to Script Properties in each project
2. ✅ Run setupRAGSystem() in RAG deployment
3. ✅ Run generateFaqEmbeddings() to create embeddings
4. ✅ Run setupChatbot() in ChatBot deployment
5. ✅ Test each endpoint with test functions
6. ✅ Update URLs in this file if you redeploy

TO UPDATE A DEPLOYMENT:
1. Make changes in Google Apps Script editor
2. Click Deploy > Manage Deployments
3. Click Edit (pencil icon)
4. Select "New Version"
5. Add description
6. Click "Deploy"
7. Copy new URL and update this file
*/

// ============================================
// TROUBLESHOOTING
// ============================================

/*
ERROR: "OpenAI API key not found"
FIX: Add OPENAI_API_KEY to Script Properties

ERROR: "FAQ embeddings not found"
FIX: Run generateFaqEmbeddings() in the RAG deployment

ERROR: "Session not found"
FIX: Create new session with getNewSessionUrl()

ERROR: CORS blocked
FIX: Use JSONP format instead of JSON

ERROR: "Quota exceeded"
FIX: Check Google Apps Script quotas or OpenAI usage
*/

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DEPLOYMENT_CONFIG;
}