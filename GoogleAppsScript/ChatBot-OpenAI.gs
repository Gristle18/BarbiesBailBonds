/**
 * ChatBot-OpenAI.gs - Stateful chatbot with memory using OpenAI
 * Deploy this as a separate Google Apps Script project
 * Maintains conversation history per user session
 */

// Configuration
const SESSION_DURATION_HOURS = 24; // How long to keep session data
const MAX_HISTORY_LENGTH = 20; // Maximum conversation turns to keep

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
  const action = e.parameter.action || 'chat';
  const message = e.parameter.message || e.parameter.query || '';
  const sessionId = e.parameter.session_id || e.parameter.sessionId || generateSessionId();
  const userId = e.parameter.user_id || e.parameter.userId || 'anonymous';
  const format = e.parameter.format || 'json';
  const callback = e.parameter.callback;

  try {
    let response;

    switch (action) {
      case 'chat':
        response = handleChatMessage(message, sessionId, userId);
        break;

      case 'new_session':
        response = createNewSession(userId);
        break;

      case 'get_history':
        response = getSessionHistory(sessionId);
        break;

      case 'clear_session':
        response = clearSession(sessionId);
        break;

      case 'stats':
        response = getSessionStats(sessionId);
        break;

      default:
        response = {
          error: 'Invalid action',
          valid_actions: ['chat', 'new_session', 'get_history', 'clear_session', 'stats']
        };
    }

    // Return response in requested format
    if (format === 'jsonp' && callback) {
      const jsonpResponse = callback + '(' + JSON.stringify(response) + ');';
      return ContentService
        .createTextOutput(jsonpResponse)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      return ContentService
        .createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeader('Access-Control-Allow-Origin', '*');
    }

  } catch (error) {
    console.error('Error in handleRequest:', error);
    const errorResponse = {
      error: error.toString(),
      session_id: sessionId
    };

    if (format === 'jsonp' && callback) {
      return ContentService
        .createTextOutput(callback + '(' + JSON.stringify(errorResponse) + ');')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      return ContentService
        .createTextOutput(JSON.stringify(errorResponse))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeader('Access-Control-Allow-Origin', '*');
    }
  }
}

/**
 * Handle chat message with conversation memory
 */
function handleChatMessage(message, sessionId, userId) {
  if (!message || message.trim() === '') {
    return {
      error: 'Message is required',
      session_id: sessionId
    };
  }

  // Get or create session
  const session = getOrCreateSession(sessionId, userId);

  // Get conversation history
  const history = session.history || [];

  // Generate response using OpenAI with context
  const aiResponse = generateChatResponse(message, history, session);

  // Update conversation history
  history.push({
    timestamp: new Date().toISOString(),
    user: message,
    assistant: aiResponse.response
  });

  // Trim history if too long
  if (history.length > MAX_HISTORY_LENGTH) {
    history.splice(0, history.length - MAX_HISTORY_LENGTH);
  }

  // Update session
  session.history = history;
  session.last_activity = new Date().toISOString();
  session.message_count = (session.message_count || 0) + 1;

  // Save session
  saveSession(sessionId, session);

  return {
    session_id: sessionId,
    user_id: userId,
    response: aiResponse.response,
    sources: aiResponse.sources,
    message_count: session.message_count,
    session_start: session.created,
    tokens_used: aiResponse.usage
  };
}

/**
 * Generate chat response using OpenAI with conversation context
 */
function generateChatResponse(message, history, session) {
  const OPENAI_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');

  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  // Build messages array for OpenAI
  const messages = [
    {
      role: 'system',
      content: `You are Barbara, a friendly and knowledgeable AI assistant for Barbie's Bail Bonds in Palm Beach County, Florida.

Key Information:
- Company: Barbie's Bail Bonds
- Location: Palm Beach County, Florida
- Phone: 561-247-0018
- Hours: 24/7 service
- Services: Bail bonds, warrant assistance, payment plans

Your personality:
- Warm, empathetic, and professional
- Understanding of the stress families face
- Quick to offer help and reassurance
- Knowledgeable about Florida bail laws
- Always mention our 24/7 availability and phone number when relevant

Remember previous conversation context and maintain continuity.
User ID: ${session.user_id || 'anonymous'}
Session started: ${session.created || 'just now'}`
    }
  ];

  // Add conversation history (last 10 exchanges for context)
  const recentHistory = history.slice(-10);
  recentHistory.forEach(turn => {
    messages.push({ role: 'user', content: turn.user });
    messages.push({ role: 'assistant', content: turn.assistant });
  });

  // Add current message
  messages.push({ role: 'user', content: message });

  // Check if message is bail-related and add FAQ context
  if (isBailRelated(message)) {
    try {
      // If RAG system is available, get relevant FAQs
      const relevantFAQs = getRelevantFAQs(message);
      if (relevantFAQs && relevantFAQs.length > 0) {
        const faqContext = relevantFAQs.map(faq =>
          `Q: ${faq.question}\nA: ${faq.answer}`
        ).join('\n\n');

        messages.push({
          role: 'system',
          content: `Relevant information from our FAQ database:\n\n${faqContext}`
        });
      }
    } catch (error) {
      console.log('FAQ search not available:', error);
    }
  }

  // Call OpenAI API
  const response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + OPENAI_API_KEY,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: messages,
      temperature: 0.8,
      max_tokens: 400,
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    }),
    muteHttpExceptions: true
  });

  const result = JSON.parse(response.getContentText());

  if (response.getResponseCode() !== 200) {
    throw new Error('OpenAI API error: ' + JSON.stringify(result));
  }

  return {
    response: result.choices[0].message.content,
    usage: result.usage,
    sources: []
  };
}

/**
 * Check if message is bail-related
 */
function isBailRelated(message) {
  const bailKeywords = [
    'bail', 'bond', 'arrest', 'jail', 'court', 'warrant', 'charge',
    'release', 'custody', 'defendant', 'payment', 'premium', 'collateral',
    'cosign', 'indemnitor', 'booking', 'palm beach', 'florida', 'cost',
    'how much', 'price', 'fee', 'money', 'pay'
  ];

  const lowerMessage = message.toLowerCase();
  return bailKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Get relevant FAQs (simplified version - implement full RAG if needed)
 */
function getRelevantFAQs(query) {
  // This is a simplified version
  // For full functionality, integrate with RAG-OpenAI.gs
  const faqs = [
    { question: "How much does bail cost?", answer: "You pay 10% of the bail amount as a premium. For example, a $5,000 bail costs $500." },
    { question: "Are you available 24/7?", answer: "Yes, we're available 24/7 including weekends and holidays." },
    { question: "How fast can you get someone out?", answer: "Release typically takes 2-6 hours after paperwork is complete." }
  ];

  // Simple keyword matching (replace with semantic search if RAG is available)
  const queryLower = query.toLowerCase();
  return faqs.filter(faq =>
    faq.question.toLowerCase().includes(queryLower.split(' ')[0]) ||
    faq.answer.toLowerCase().includes(queryLower.split(' ')[0])
  ).slice(0, 3);
}

/**
 * Session Management Functions
 */

function generateSessionId() {
  return Utilities.getUuid();
}

function getOrCreateSession(sessionId, userId) {
  const cache = CacheService.getScriptCache();
  const sessionKey = 'session_' + sessionId;

  // Try to get existing session
  const cachedSession = cache.get(sessionKey);
  if (cachedSession) {
    return JSON.parse(cachedSession);
  }

  // Create new session
  const newSession = {
    session_id: sessionId,
    user_id: userId,
    created: new Date().toISOString(),
    last_activity: new Date().toISOString(),
    history: [],
    message_count: 0
  };

  // Save to cache (6 hours = 21600 seconds)
  cache.put(sessionKey, JSON.stringify(newSession), 21600);

  // Also save to Properties for longer persistence
  saveSessionToProperties(sessionId, newSession);

  return newSession;
}

function saveSession(sessionId, session) {
  const cache = CacheService.getScriptCache();
  const sessionKey = 'session_' + sessionId;

  // Save to cache
  cache.put(sessionKey, JSON.stringify(session), 21600);

  // Also save to Properties for persistence
  saveSessionToProperties(sessionId, session);
}

function saveSessionToProperties(sessionId, session) {
  try {
    const userProperties = PropertiesService.getUserProperties();
    const sessionKey = 'session_' + sessionId;

    // Properties have a 9KB limit per key, so we might need to compress
    const sessionData = JSON.stringify(session);

    if (sessionData.length > 8000) {
      // If too large, only save recent history
      const trimmedSession = {
        ...session,
        history: session.history.slice(-5)
      };
      userProperties.setProperty(sessionKey, JSON.stringify(trimmedSession));
    } else {
      userProperties.setProperty(sessionKey, sessionData);
    }

    // Clean up old sessions
    cleanupOldSessions();

  } catch (error) {
    console.error('Error saving session to properties:', error);
  }
}

function getSessionHistory(sessionId) {
  const session = getOrCreateSession(sessionId, 'unknown');
  return {
    session_id: sessionId,
    history: session.history || [],
    message_count: session.message_count || 0,
    created: session.created,
    last_activity: session.last_activity
  };
}

function clearSession(sessionId) {
  const cache = CacheService.getScriptCache();
  const userProperties = PropertiesService.getUserProperties();

  cache.remove('session_' + sessionId);
  userProperties.deleteProperty('session_' + sessionId);

  return {
    success: true,
    message: 'Session cleared',
    session_id: sessionId
  };
}

function createNewSession(userId) {
  const newSessionId = generateSessionId();
  const session = getOrCreateSession(newSessionId, userId);

  return {
    session_id: newSessionId,
    user_id: userId,
    created: session.created,
    message: 'New session created'
  };
}

function getSessionStats(sessionId) {
  const session = getOrCreateSession(sessionId, 'unknown');

  return {
    session_id: sessionId,
    user_id: session.user_id,
    created: session.created,
    last_activity: session.last_activity,
    message_count: session.message_count || 0,
    history_length: (session.history || []).length
  };
}

function cleanupOldSessions() {
  try {
    const userProperties = PropertiesService.getUserProperties();
    const allProperties = userProperties.getProperties();

    const now = new Date();
    const maxAge = SESSION_DURATION_HOURS * 60 * 60 * 1000; // Convert to milliseconds

    Object.keys(allProperties).forEach(key => {
      if (key.startsWith('session_')) {
        try {
          const session = JSON.parse(allProperties[key]);
          const lastActivity = new Date(session.last_activity || session.created);

          if (now - lastActivity > maxAge) {
            userProperties.deleteProperty(key);
            console.log('Cleaned up old session:', key);
          }
        } catch (error) {
          // If can't parse, delete it
          userProperties.deleteProperty(key);
        }
      }
    });
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
  }
}

/**
 * Test function
 */
function testChatbot() {
  console.log('Testing chatbot...');

  const sessionId = generateSessionId();
  const userId = 'test_user';

  // Test messages
  const messages = [
    "Hi, I need help with bail",
    "My brother was arrested last night",
    "How much will it cost for a $10,000 bond?",
    "Can you remind me what we were talking about?",
    "Thank you for your help"
  ];

  messages.forEach((message, index) => {
    console.log(`\n--- Message ${index + 1} ---`);
    console.log('User:', message);

    const response = handleChatMessage(message, sessionId, userId);
    console.log('Assistant:', response.response);
    console.log('Message count:', response.message_count);
  });

  // Test getting history
  console.log('\n--- Session History ---');
  const history = getSessionHistory(sessionId);
  console.log('Total messages:', history.message_count);
  console.log('History length:', history.history.length);
}

/**
 * Setup function
 */
function setupChatbot() {
  console.log('Setting up Chatbot with OpenAI...');

  // Check for API key
  const apiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
  if (!apiKey) {
    console.error('ERROR: OpenAI API key not found!');
    console.log('Please set OPENAI_API_KEY in Script Properties:');
    console.log('1. Go to Project Settings (gear icon)');
    console.log('2. Scroll down to Script Properties');
    console.log('3. Add property: OPENAI_API_KEY = your-api-key-here');
    return;
  }

  console.log('✓ OpenAI API key configured');
  console.log('✓ Cache service ready for session storage');
  console.log('✓ Properties service ready for persistence');

  console.log('\nChatbot endpoints:');
  console.log('- ?action=chat&message=Hello&session_id=xxx');
  console.log('- ?action=new_session&user_id=xxx');
  console.log('- ?action=get_history&session_id=xxx');
  console.log('- ?action=clear_session&session_id=xxx');
  console.log('- ?action=stats&session_id=xxx');

  console.log('\nSetup complete! Run testChatbot() to test.');
}