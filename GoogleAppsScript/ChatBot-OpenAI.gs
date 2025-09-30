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

  // Update session (no persistence in simplified version)
  session.history = history;
  session.last_activity = new Date().toISOString();
  session.message_count = (session.message_count || 0) + 1;

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
 * Generate simple chat response
 */
function generateChatResponse(message, history, session) {
  const OPENAI_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');

  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    // Check if they mentioned leaving a review
    if (message.toLowerCase().includes('left a review') ||
        message.toLowerCase().includes('gave you') ||
        message.toLowerCase().includes('posted') ||
        message.toLowerCase().includes('reviewed you')) {
      return {
        response: "Thank you SO much for supporting us with that review! 🙏 It truly means the world to our family business. Is there anything else I can help you with?",
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        sources: []
      };
    }

    // Generate normal response
    return generateSimpleResponse(message, history);

  } catch (error) {
    console.error('Error in generateChatResponse:', error);
    return {
      response: "I apologize, but I'm having trouble processing that. Please try again or call us at 561-247-0018.",
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      sources: []
    };
  }
}


/**
 * Generate simple response with hardcoded steps and review request
 */
function generateSimpleResponse(message, history) {
  const OPENAI_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');

  // Get relevant FAQ content for the user's message
  const faqResults = getRelevantFAQs(message);
  const faqContext = faqResults.length > 0
    ? `\n\nRELEVANT FAQ RESULTS:\n${faqResults.map(faq => `Q: ${faq.question}\nA: ${faq.answer}`).join('\n\n')}`
    : '';

  const systemPrompt = `You are Barbara from Barbie's Bail Bonds. Help people with bail bonds questions.

FIRST STEP: Ask if they are the defendant (doing bond for themselves) or the indemnitor (posting bond for someone else).

BAIL BOND PROCESS STEPS (after determining who they are):

FOR DEFENDANTS (doing bond for themselves):
- MISDEMEANOR/TRAFFIC: No jail time - just pay bond and appear in court
- FELONY: Walkthrough bond process
1. APPLICATION - Fill out form: https://www.barbiesbailbonds.com/start-here/online-application
2. PAYMENT - Pay 10% of bond amount (Zelle: payments@barbiesbailbonds.com or call 561-247-0018)
3. COORDINATION - For felonies: arrange surrender with pre-approved bond
4. COURT - Appear for scheduled court date

FOR INDEMNITORS (posting bond for someone already in jail):
1. LOCATE - Find inmate: https://www.barbiesbailbonds.com/inmate-locator
2. APPLICATION - Fill out form: https://www.barbiesbailbonds.com/start-here/online-application
3. PAYMENT - Pay 10% of bond amount (Zelle: payments@barbiesbailbonds.com or call 561-247-0018)
4. RELEASE - We post bond, release in 4-8 hours

FAQ: https://www.barbiesbailbonds.com/faq

REVIEW REQUEST: After helping someone, ask for 5-star review with priority bond posting incentive:
"I can prioritize your bond posting if you leave a quick 5-star review: https://g.page/r/CcsG2h4Q6V-WEBM/review"${faqContext}

If FAQ results are provided above, use them if relevant to answer the user's question. Otherwise, follow the standard process flows.

Keep responses to 3 sentences max. Always say "call us" not "call me".`;

  const messages = [{ role: 'system', content: systemPrompt }];

  // Add conversation history if available
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
      usage: result.usage,
      sources: []
    };

  } catch (error) {
    console.error('Error in generateSimpleResponse:', error);
    return {
      response: "I'm here to help with bail bonds. Please call us at 561-247-0018 for immediate assistance.",
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      sources: []
    };
  }
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

// Simplified session management - no persistence needed
function getOrCreateSession(sessionId, userId) {
  return {
    session_id: sessionId,
    user_id: userId,
    created: new Date().toISOString(),
    history: [],
    message_count: 0
  };
}

function createNewSession(userId) {
  const newSessionId = generateSessionId();
  return {
    session_id: newSessionId,
    user_id: userId,
    created: new Date().toISOString(),
    message: 'New session created'
  };
}

function getSessionHistory(sessionId) {
  return {
    session_id: sessionId,
    history: [],
    message_count: 0,
    message: 'No session persistence in simplified version'
  };
}

function clearSession(sessionId) {
  return {
    success: true,
    message: 'Session cleared',
    session_id: sessionId
  };
}

function getSessionStats(sessionId) {
  return {
    session_id: sessionId,
    message_count: 0,
    message: 'No session persistence in simplified version'
  };
}

