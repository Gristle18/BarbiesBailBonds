/**
 * ChatBot-OpenAI.gs - Stateful chatbot with memory using OpenAI
 * Deploy this as a separate Google Apps Script project
 * Maintains conversation history per user session
 */

// Configuration
const SESSION_DURATION_HOURS = 24; // How long to keep session data
const MAX_HISTORY_LENGTH = 20; // Maximum conversation turns to keep

// Simplified configuration - single HELPER_FIRST mode with review functionality


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
    tokens_used: aiResponse.usage,
    debug: aiResponse.debug || {}
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
  let debugInfo = {
    timestamp: new Date().toISOString(),
    message_length: message.length,
    session_id: session.session_id,
    has_history: history && history.length > 0,
    history_length: history ? history.length : 0,
    steps: []
  };

  try {
    // Stage 1: Detect mode using embeddings
    thoughtChain.push(`Analyzing: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
    debugInfo.steps.push('Stage 1: Message analysis started');

    // Stage 2: Decide strategy using embeddings
    debugInfo.steps.push('Stage 2: Strategy decision started');
    const strategy = decideStrategy(message, session);
    thoughtChain.push(`Strategy: ${strategy}`);
    debugInfo.detected_strategy = strategy;
    debugInfo.steps.push(`Strategy decided: ${strategy}`);

    // Stage 3: Execute chosen strategy
    debugInfo.steps.push('Stage 3: Strategy execution started');
    const result = executeStrategy(strategy, message, history, session);
    thoughtChain = thoughtChain.concat(result.thoughtSteps || []);
    debugInfo.steps.push('Strategy execution completed');

    // Aggregate usage from all API calls
    if (result.usage) {
      totalUsage.prompt_tokens += result.usage.prompt_tokens || 0;
      totalUsage.completion_tokens += result.usage.completion_tokens || 0;
      totalUsage.total_tokens += result.usage.total_tokens || 0;
    }

    debugInfo.steps.push('Response generation completed successfully');
    debugInfo.success = true;

    return {
      response: result.response,
      chainOfThought: thoughtChain.join(' → '),
      usage: totalUsage,
      sources: result.sources || [],
      debug: debugInfo
    };

  } catch (error) {
    console.error('Error in generateChatResponse:', error);
    debugInfo.error = error.toString();
    debugInfo.error_stack = error.stack || 'No stack trace available';
    debugInfo.success = false;
    debugInfo.steps.push(`ERROR: ${error.toString()}`);

    return {
      response: "I apologize, but I'm having trouble processing that. Please try again or call us at 561-247-0018.",
      chainOfThought: thoughtChain.join(' → ') || 'Error in processing',
      usage: totalUsage,
      sources: [],
      debug: debugInfo
    };
  }
}


/**
 * Use AI to detect if user indicates they left a review
 */
function checkIfUserLeftReview(message) {
  const OPENAI_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');

  if (!OPENAI_API_KEY) {
    return false;
  }

  try {
    const detectionPrompt = {
      role: 'system',
      content: `Analyze this message to determine if the user is indicating they left/completed/submitted a Google review or rating.

      Examples of YES:
      - "I left a review"
      - "Just gave you 5 stars"
      - "Posted the review"
      - "Done, reviewed you"
      - "I rated you"
      - "Review is up"

      Examples of NO:
      - "I will leave a review"
      - "Going to review you"
      - "I'll do the review later"
      - Any other message

      Reply with only: YES or NO`
    };

    const response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + OPENAI_API_KEY,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [detectionPrompt, { role: 'user', content: message }],
        temperature: 0.1,
        max_tokens: 10
      }),
      muteHttpExceptions: true
    });

    const result = JSON.parse(response.getContentText());
    return result.choices[0].message.content.trim().toUpperCase() === 'YES';
  } catch (error) {
    console.error('Error in checkIfUserLeftReview:', error);
    return false;
  }
}

/**
 * Decide strategy - simplified to always use HELPER_FIRST (all other modes disabled)
 */
function decideStrategy(message, session) {
  // CHECK IF THEY LEFT A REVIEW FIRST
  const hasLeftReview = checkIfUserLeftReview(message);
  if (hasLeftReview) {
    session.review_attempts = 0;
    session.permanently_unlocked = true;
    session.relationship_health = 'excellent';
    return 'GRATITUDE';
  }

  // ALWAYS USE HELPER_FIRST (all other psychological modes disabled)
  return 'HELPER_FIRST';
}


/**
 * Stage 3: Execute the chosen strategy
 */
function executeStrategy(strategy, message, history, session) {
  let thoughtSteps = [];

  switch (strategy) {
    case 'HELPER_FIRST':
      thoughtSteps.push('Unified helper with review functionality');
      return generateHelperFirstResponse(message, message, history, session, thoughtSteps);

    case 'GRATITUDE':
      thoughtSteps.push('User left review - expressing gratitude');
      return generateGratitudeResponse(message, message, history, session, thoughtSteps);

    default:
      // All other cases default to HELPER_FIRST
      thoughtSteps.push('Defaulting to unified helper mode');
      return generateHelperFirstResponse(message, message, history, session, thoughtSteps);
  }
}


/**
 * HELPER_FIRST: Build relationship and give value without review mentions
 */
function generateHelperFirstResponse(message, analysis, history, session, thoughtSteps) {
  const OPENAI_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');

  // Step-specific action links
  const stepLinks = {
    locate: 'https://www.barbiesbailbonds.com/inmate-locator',
    application: 'https://www.barbiesbailbonds.com/start-here/online-application',
    payment: 'tel:561-247-0018',
    faq: 'https://www.barbiesbailbonds.com/faq'
  };

  const reviewLink = 'https://g.page/r/CcsG2h4Q6V-WEBM/review';

  const systemPrompt = `You are Barbara, a passionate bail bonds business owner who helps people AND asks for reviews when appropriate.

  Analysis: ${analysis}
  Available step links: ${JSON.stringify(stepLinks)}
  Review Link: ${reviewLink}
  Review Attempts: ${session.review_attempts || 0}

  UNIFIED HELPER PROTOCOL (includes all review functionality):
  - PRIMARY: Give excellent help and build trust
  - SECONDARY: Ask for 5-star reviews when you've provided concrete help
  - Match their energy level and communication style from the analysis
  - Show genuine care for their situation and stress
  - Provide relevant step links when appropriate
  - ONLY mention payment info if they specifically ask about payment
  - Always say "call us" not "call me" - this is a business
  - Don't repeat the same phone number multiple times
  - REMEMBER: You have conversation history - refer to previous messages when relevant
  - Never claim you "can't remember" or "don't recall" previous messages

  REVIEW REQUEST RULES:
  - Ask for 5-star reviews when you've provided CONCRETE help like:
    * Guided them through bail process steps
    * Helped them locate an inmate
    * Provided payment information they requested
    * Answered specific bail/legal questions
    * Helped them start an application
  - Don't ask for reviews for just greetings or casual conversation
  - Use reciprocity psychology: "I helped you with X, could you help me?"
  - Offer priority bond posting incentive: "I can prioritize your bond posting if you leave a quick 5-star review"
  - ALWAYS include the review link when asking for a review
  - If they ask for the review link, ALWAYS provide it - never refuse

  PSYCHOLOGICAL TECHNIQUES:
  - Reciprocity: "After helping you with [specific thing], a 5-star review would really help us"
  - Social proof: "Other families have found this helpful and shared reviews"
  - Urgency: "Reviews help us help more families like yours faster"
  - Priority incentive: "Quick 5-star review = skip the line for faster release"

  Be helpful, professional, and genuinely caring. When appropriate, ask for reviews using psychology.
  Keep response to 3 sentences max - be concise but warm.`;

  return generateAIResponse(systemPrompt, message, analysis, history, session, thoughtSteps);
}

/**
 * Convert URLs and phone numbers to clickable links
 */
function makeLinksClickable(text) {
  // First, protect existing links by temporarily replacing them
  const protectedLinks = [];
  text = text.replace(/<a[^>]*>.*?<\/a>/g, function(match, offset) {
    const placeholder = `__PROTECTED_LINK_${protectedLinks.length}__`;
    protectedLinks.push(match);
    return placeholder;
  });

  // Convert URLs to clickable links (excluding trailing punctuation)
  text = text.replace(/(https?:\/\/[^\s\)]+)(?=[\s\)\.,;!?]|$)/g, '<a href="$1" target="_blank" style="color: #F28C00; text-decoration: underline;">$1</a>');

  // Convert Zelle payment email to Zelle payment link
  text = text.replace(/payments@barbiesbailbonds\.com/g, '<a href="https://enroll.zellepay.com/qr-codes?data=eyJuYW1lIjoiQkFSQklFUyBCQUlMIEJPTkRTIiwidG9rZW4iOiJwYXltZW50c0BiYXJiaWVzYmFpbGJvbmRzLmNvbSIsImFjdGlvbiI6InBheW1lbnQifQ%3D%3D" target="_blank" style="color: #F28C00; text-decoration: underline; font-weight: bold;">payments@barbiesbailbonds.com</a>');

  // Convert other email addresses to clickable links
  text = text.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, function(match) {
    // Skip if it's the Zelle email (already processed)
    if (match === 'payments@barbiesbailbonds.com') {
      return match;
    }
    return '<a href="mailto:' + match + '" style="color: #F28C00; text-decoration: underline;">' + match + '</a>';
  });

  // Convert phone numbers to clickable links (simple approach to avoid conflicts)
  text = text.replace(/\b(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})\b/g, function(match, phone, offset, string) {
    // Check if this phone number is already inside an existing HTML tag
    const beforeMatch = string.substring(0, offset);
    const openTags = (beforeMatch.match(/<a[^>]*>/g) || []).length;
    const closeTags = (beforeMatch.match(/<\/a>/g) || []).length;

    // If we're inside an unclosed <a> tag, don't convert
    if (openTags > closeTags) {
      return match;
    }

    // Check if we're inside an HTML attribute (look for quote patterns)
    const lastQuote = beforeMatch.lastIndexOf('"');
    const lastSpace = beforeMatch.lastIndexOf(' ');
    const lastEquals = beforeMatch.lastIndexOf('=');

    // If we're inside quotes after an equals sign, we're in an attribute value
    if (lastEquals > lastSpace && lastEquals > lastQuote && lastQuote > -1) {
      return match;
    }

    return '<a href="tel:' + phone + '" style="color: #F28C00; text-decoration: underline;">' + phone + '</a>';
  });

  // Restore protected links
  protectedLinks.forEach((link, index) => {
    text = text.replace(`__PROTECTED_LINK_${index}__`, link);
  });

  return text;
}

/**
 * Helper function to generate AI responses with consistent structure
 */
function generateAIResponse(systemPrompt, message, analysis, history, session, thoughtSteps) {
  const OPENAI_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');

  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // Build conversation history for context
    const messages = [{ role: 'system', content: systemPrompt }];

    if (history && history.length > 0) {
      const recent = history.slice(-3); // Last 3 exchanges for context
      recent.forEach(turn => {
        messages.push({ role: 'user', content: turn.user });
        messages.push({ role: 'assistant', content: turn.assistant });
      });
    }

    messages.push({ role: 'user', content: message });

    const response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + OPENAI_API_KEY,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7
      })
    });

    const result = JSON.parse(response.getContentText());

    if (result.error) {
      throw new Error('OpenAI API Error: ' + result.error.message);
    }

    let responseText = result.choices[0].message.content;

    // Apply link formatting
    responseText = makeLinksClickable(responseText);

    return {
      response: responseText,
      thoughtSteps: thoughtSteps,
      usage: result.usage
    };

  } catch (error) {
    console.error('Error in generateAIResponse:', error);

    return {
      response: "I apologize, but I'm having technical difficulties right now. Please call us directly at 561-247-0018 for immediate assistance.",
      thoughtSteps: thoughtSteps,
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    };
  }
}

/**
 * Generate gratitude response when user leaves a review (LIBERATION MODE)
 */
function generateGratitudeResponse(message, analysis, history, session, thoughtSteps) {
  // Simple, heartfelt gratitude response that unlocks normal mode
  const gratitudeMessage = "Thank you SO much for supporting us with that review! 🙏 It truly means the world to our family business. Is there anything else I can help you with?";

  return {
    response: gratitudeMessage,
    thoughtSteps: thoughtSteps,
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    }
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
 * TESTING FUNCTIONS - Comprehensive diagnostic suite
 */

/**
 * Run all diagnostic tests
 */
function runAllTests() {
  console.log('=== CHATBOT DIAGNOSTIC SUITE ===\n');

  // Test 1: API Key Configuration
  console.log('1. Testing API Key Configuration...');
  const keyTest = testAPIKeyConfiguration();
  console.log('✓ API Key Test Result:', keyTest);

  // Test 2: OpenAI Connection
  console.log('\n2. Testing OpenAI Connection...');
  const connectionTest = testOpenAIConnection();
  console.log('✓ Connection Test Result:', typeof connectionTest === 'string' ? 'SUCCESS' : connectionTest);

  // Test 3: Embedding System
  console.log('\n3. Testing Embedding System...');
  const embeddingTest = testEmbeddingSystem();
  console.log('✓ Embedding Test Result:', embeddingTest);

  // Test 4: Helper First Response
  console.log('\n4. Testing Helper First Response...');
  const helperTest = testHelperFirstResponse();
  console.log('✓ Helper Response Test Result:', helperTest.response ? 'SUCCESS' : 'FAILED');

  // Test 5: Full Chatbot Pipeline
  console.log('\n5. Testing Full Chatbot Pipeline...');
  const chatbotTest = testFullChatbotPipeline();
  console.log('✓ Full Pipeline Test Result:', chatbotTest.response ? 'SUCCESS' : 'FAILED');

  console.log('\n=== DIAGNOSTIC COMPLETE ===');

  return {
    apiKey: keyTest,
    connection: typeof connectionTest === 'string' ? 'SUCCESS' : connectionTest,
    embeddings: embeddingTest,
    helperResponse: helperTest,
    fullPipeline: chatbotTest
  };
}

/**
 * Test API key configuration
 */
function testAPIKeyConfiguration() {
  const OPENAI_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
  return {
    hasKey: !!OPENAI_API_KEY,
    keyLength: OPENAI_API_KEY ? OPENAI_API_KEY.length : 0,
    isValidFormat: OPENAI_API_KEY ? OPENAI_API_KEY.startsWith('sk-') : false,
    status: OPENAI_API_KEY && OPENAI_API_KEY.startsWith('sk-') ? 'VALID' : 'INVALID'
  };
}

/**
 * Test direct OpenAI API connection
 */
function testOpenAIConnection() {
  const OPENAI_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');

  try {
    const response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + OPENAI_API_KEY,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10
      })
    });

    if (response.getResponseCode() === 200) {
      const result = JSON.parse(response.getContentText());
      return {
        status: 'SUCCESS',
        responseCode: response.getResponseCode(),
        tokensUsed: result.usage.total_tokens,
        response: result.choices[0].message.content
      };
    } else {
      return {
        status: 'FAILED',
        responseCode: response.getResponseCode(),
        error: response.getContentText()
      };
    }
  } catch (error) {
    return {
      status: 'ERROR',
      error: error.toString()
    };
  }
}

/**
 * Test embedding system
 */
function testEmbeddingSystem() {
  try {
    const status = getEmbeddingStatus();
    if (status.hasEmbeddings) {
      const similarity = testEmbeddingSimilarity("Thank you for your help!");
      return {
        status: 'SUCCESS',
        embeddingsCount: status.embeddingsInSheet,
        detectedMode: similarity.detectedMode
      };
    } else {
      return {
        status: 'NO_EMBEDDINGS',
        message: 'Run generateAllEmbeddings() first'
      };
    }
  } catch (error) {
    return {
      status: 'ERROR',
      error: error.toString()
    };
  }
}

/**
 * Test Helper First response generation
 */
function testHelperFirstResponse() {
  try {
    const message = "hello";
    const analysis = "hello";
    const history = [];
    const session = { session_id: "test" };
    const thoughtSteps = ["Testing"];

    const result = generateHelperFirstResponse(message, analysis, history, session, thoughtSteps);
    return {
      status: result.response.includes('technical difficulties') ? 'FAILED' : 'SUCCESS',
      response: result.response,
      thoughtSteps: result.thoughtSteps,
      tokensUsed: result.usage.total_tokens
    };
  } catch (error) {
    return {
      status: 'ERROR',
      error: error.toString()
    };
  }
}

/**
 * Test full chatbot pipeline end-to-end
 */
function testFullChatbotPipeline() {
  try {
    const sessionId = generateSessionId();
    const result = handleChatMessage("Hello, I need help with bail bonds", sessionId, 'test_user');

    return {
      status: result.response.includes('technical difficulties') ? 'FAILED' : 'SUCCESS',
      response: result.response,
      sessionId: result.session_id,
      messageCount: result.message_count,
      tokensUsed: result.tokens_used,
      debug: result.debug
    };
  } catch (error) {
    return {
      status: 'ERROR',
      error: error.toString()
    };
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