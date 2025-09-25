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
 * Generate chat response using multi-stage AI pipeline
 */
function generateChatResponse(message, history, session) {
  const OPENAI_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');

  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  let thoughtChain = [];
  let totalUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

  try {
    // Stage 1: Analyze the message
    const analysis = analyzeMessage(message, history);
    thoughtChain.push(`Analyzing: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
    thoughtChain.push(analysis);

    // Stage 2: Decide strategy
    const strategy = decideStrategy(analysis, message);
    thoughtChain.push(`Strategy: ${strategy}`);

    // Stage 3: Execute chosen strategy
    const result = executeStrategy(strategy, message, analysis, history, session);
    thoughtChain = thoughtChain.concat(result.thoughtSteps || []);

    // Aggregate usage from all API calls
    if (result.usage) {
      totalUsage.prompt_tokens += result.usage.prompt_tokens || 0;
      totalUsage.completion_tokens += result.usage.completion_tokens || 0;
      totalUsage.total_tokens += result.usage.total_tokens || 0;
    }

    return {
      response: result.response,
      chainOfThought: thoughtChain.join(' → '),
      usage: totalUsage,
      sources: result.sources || []
    };

  } catch (error) {
    console.error('Error in generateChatResponse:', error);
    return {
      response: "I apologize, but I'm having trouble processing that. Please try again or call us at 561-247-0018.",
      chainOfThought: thoughtChain.join(' → ') || 'Error in processing',
      usage: totalUsage,
      sources: []
    };
  }
}

/**
 * Stage 1: Analyze the message using AI
 */
function analyzeMessage(message, history) {
  const OPENAI_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');

  try {
    const analysisPrompt = {
      role: 'system',
      content: `Analyze this bail bonds inquiry. Answer in this exact format:
      "Asking: [what they want] | Step: [Not started/Locate/Application/Payment/Waiting] | Mood: [emotional state]"
      Be concise - max 15 words total.`
    };

    // Add recent context if available
    const contextMessages = [];
    if (history && history.length > 0) {
      const recent = history.slice(-2);
      recent.forEach(turn => {
        contextMessages.push({ role: 'user', content: turn.user });
        contextMessages.push({ role: 'assistant', content: turn.assistant });
      });
    }

    const response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + OPENAI_API_KEY,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [analysisPrompt, ...contextMessages, { role: 'user', content: message }],
        temperature: 0.3,
        max_tokens: 50
      }),
      muteHttpExceptions: true
    });

    const result = JSON.parse(response.getContentText());
    return result.choices[0].message.content;
  } catch (error) {
    console.error('Error in analyzeMessage:', error);
    return 'Asking: unknown | Step: Not started | Mood: neutral';
  }
}

/**
 * Stage 2: Decide strategy using AI
 */
function decideStrategy(analysis, message) {
  const OPENAI_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');

  try {
    const strategyPrompt = {
      role: 'system',
      content: `Based on this analysis: "${analysis}"
      And message: "${message}"

      Choose the best approach:
      - DIRECT: I can answer this myself (greetings, simple questions, general info)
      - FAQ: I should search our FAQ database (specific bail questions, procedures, requirements)
      - GUIDE: I should guide them through the bail process step-by-step

      Reply with only one word: DIRECT, FAQ, or GUIDE`
    };

    const response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + OPENAI_API_KEY,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [strategyPrompt],
        temperature: 0.2,
        max_tokens: 10
      }),
      muteHttpExceptions: true
    });

    const result = JSON.parse(response.getContentText());
    const strategy = result.choices[0].message.content.trim().toUpperCase();

    // Validate strategy
    if (['DIRECT', 'FAQ', 'GUIDE'].includes(strategy)) {
      return strategy;
    }
    return 'DIRECT'; // Default fallback

  } catch (error) {
    console.error('Error in decideStrategy:', error);
    return 'DIRECT';
  }
}

/**
 * Stage 3: Execute the chosen strategy
 */
function executeStrategy(strategy, message, analysis, history, session) {
  let thoughtSteps = [];

  switch (strategy) {
    case 'FAQ':
      thoughtSteps.push('Searching FAQ database');
      const faqs = getRelevantFAQs(message);
      thoughtSteps.push(`Found ${faqs.length} relevant FAQs`);
      return generateFAQResponse(message, analysis, faqs, history, session, thoughtSteps);

    case 'GUIDE':
      thoughtSteps.push('Guiding through bail process');
      return generateGuidanceResponse(message, analysis, history, session, thoughtSteps);

    case 'DIRECT':
    default:
      thoughtSteps.push('Responding from knowledge');
      return generateDirectResponse(message, analysis, history, session, thoughtSteps);
  }
}

/**
 * Generate a direct response without FAQ search
 */
function generateDirectResponse(message, analysis, history, session, thoughtSteps) {
  const OPENAI_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');

  const systemPrompt = `You are Barbara, a helpful assistant for Barbie's Bail Bonds in Palm Beach County.
  Analysis: ${analysis}

  Respond naturally to this message. Keep it under 2-3 sentences. Be warm and helpful.
  If they need bail help, guide them to the first step (inmate locator).`;

  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  // Add recent history for context
  if (history && history.length > 0) {
    const recent = history.slice(-3);
    recent.forEach(turn => {
      messages.push({ role: 'user', content: turn.user });
      messages.push({ role: 'assistant', content: turn.assistant });
    });
  }

  messages.push({ role: 'user', content: message });

  try {
    const response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + OPENAI_API_KEY,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 150
      }),
      muteHttpExceptions: true
    });

    const result = JSON.parse(response.getContentText());
    return {
      response: result.choices[0].message.content,
      thoughtSteps: thoughtSteps,
      usage: result.usage
    };
  } catch (error) {
    console.error('Error in generateDirectResponse:', error);
    return {
      response: "I'm here to help. How can I assist you with bail bonds today?",
      thoughtSteps: thoughtSteps,
      usage: {}
    };
  }
}

/**
 * Generate response using FAQ context
 */
function generateFAQResponse(message, analysis, faqs, history, session, thoughtSteps) {
  const OPENAI_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');

  // Build FAQ context
  const faqContext = faqs.map(faq => `Q: ${faq.question}\nA: ${faq.answer}`).join('\n\n');

  const systemPrompt = `You are Barbara, a helpful assistant for Barbie's Bail Bonds in Palm Beach County.
  Analysis: ${analysis}

  Use this FAQ knowledge to inform your response, but don't quote directly:
  ${faqContext}

  Respond naturally in 2-3 sentences. Focus on what they need to DO next.`;

  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  // Add recent history
  if (history && history.length > 0) {
    const recent = history.slice(-2);
    recent.forEach(turn => {
      messages.push({ role: 'user', content: turn.user });
      messages.push({ role: 'assistant', content: turn.assistant });
    });
  }

  messages.push({ role: 'user', content: message });

  try {
    const response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + OPENAI_API_KEY,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.6,
        max_tokens: 150
      }),
      muteHttpExceptions: true
    });

    const result = JSON.parse(response.getContentText());
    return {
      response: result.choices[0].message.content,
      thoughtSteps: thoughtSteps,
      usage: result.usage,
      sources: faqs
    };
  } catch (error) {
    console.error('Error in generateFAQResponse:', error);
    return {
      response: "I can help with that. Please call us at 561-247-0018 for specific information.",
      thoughtSteps: thoughtSteps,
      usage: {}
    };
  }
}

/**
 * Generate guidance through bail process steps
 */
function generateGuidanceResponse(message, analysis, history, session, thoughtSteps) {
  const OPENAI_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');

  const systemPrompt = `You are Barbara, a helpful assistant for Barbie's Bail Bonds in Palm Beach County.
  Analysis: ${analysis}

  BAIL PROCESS STEPS:
  1. LOCATE - Use inmate locator to verify custody (5-10 min)
  2. APPLICATION - Complete online form (10-15 min)
  3. PAYMENT - Call 561-247-0018 to confirm amount, then pay via Zelle/Card/Cash
  4. WAITING - Bond posted, release in 4-8 hours

  Guide them to the appropriate step based on where they are. Be specific and action-oriented.
  Keep response to 2-3 sentences max. Only mention phone for step 3.`;

  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  // Add conversation history for context
  if (history && history.length > 0) {
    const recent = history.slice(-3);
    recent.forEach(turn => {
      messages.push({ role: 'user', content: turn.user });
      messages.push({ role: 'assistant', content: turn.assistant });
    });
  }

  messages.push({ role: 'user', content: message });

  try {
    const response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + OPENAI_API_KEY,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.6,
        max_tokens: 150
      }),
      muteHttpExceptions: true
    });

    const result = JSON.parse(response.getContentText());
    return {
      response: result.choices[0].message.content,
      thoughtSteps: thoughtSteps,
      usage: result.usage
    };
  } catch (error) {
    console.error('Error in generateGuidanceResponse:', error);
    return {
      response: "Let's get started. First, use our inmate locator to verify they're in custody.",
      thoughtSteps: thoughtSteps,
      usage: {}
    };
  }
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
  try {
    // Call the RAG system for semantic FAQ search
    const ragUrl = 'https://script.google.com/macros/s/AKfycbwK8UXXlwI1mmGT_Qlae2IoyJna1k7lGxL6544IsSEyqeFaR4hgimyteD1r71o9RQoq/exec';
    const response = UrlFetchApp.fetch(
      ragUrl + '?action=search&query=' + encodeURIComponent(query) + '&limit=3',
      { muteHttpExceptions: true, timeout: 5 }
    );

    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      if (data.results && data.results.length > 0) {
        // Return top 3 most relevant FAQs
        return data.results.slice(0, 3).map(r => ({
          question: r.question,
          answer: r.answer
        }));
      }
    }
  } catch (error) {
    console.log('RAG search failed, using fallback:', error);
  }

  // Fallback to basic FAQs if RAG unavailable
  const basicFaqs = [
    { question: "How much does bail cost?", answer: "You pay 10% of the bail amount as a premium." },
    { question: "How fast can you get someone out?", answer: "Release typically takes 4-8 hours after bond is posted." },
    { question: "Are you available 24/7?", answer: "Yes, we're available 24/7 including weekends and holidays." }
  ];

  const queryLower = query.toLowerCase();
  return basicFaqs.filter(faq =>
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