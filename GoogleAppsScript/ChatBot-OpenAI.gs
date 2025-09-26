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
    const strategy = decideStrategy(analysis, message, session);
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
      content: `Analyze this customer like a psychologically savvy business owner. Format:
      "Asking: [what they want] | Step: [Not started/Locate/Application/Payment/Waiting] | Style: [formal/casual/rushed/relaxed] | Energy: [high/medium/low] | Satisfaction: [frustrated/neutral/pleased/grateful] | Value_Given: [none/some/significant] | Review_Moment: [NO/BUILDING/READY - READY only if they're grateful AND we've provided real value]"

      READY = They're happy + we helped them significantly. Otherwise NO or BUILDING.
      Be concise - max 25 words total.`
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
 * Stage 2: Decide strategy using AI
 */
function decideStrategy(analysis, message, session) {
  const OPENAI_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');

  // CHECK IF THEY LEFT A REVIEW
  const hasLeftReview = checkIfUserLeftReview(message);
  if (hasLeftReview) {
    session.review_attempts = 0;
    session.permanently_unlocked = true;
    session.relationship_health = 'excellent';
    return 'GRATITUDE';
  }

  // HUMAN BUSINESS OWNER PSYCHOLOGY
  // Parse the psychological analysis
  const reviewMoment = analysis.includes('Review_Moment: READY');
  const isBuilding = analysis.includes('Review_Moment: BUILDING');
  const isGrateful = analysis.includes('Satisfaction: grateful');
  const isPleasant = analysis.includes('Satisfaction: pleased');
  const isFrustrated = analysis.includes('Satisfaction: frustrated');
  const valueGiven = analysis.includes('Value_Given: significant');

  // Track relationship health
  if (!session.relationship_health) session.relationship_health = 'neutral';
  if (isFrustrated) session.relationship_health = 'strained';
  if (isGrateful && valueGiven) session.relationship_health = 'excellent';

  // Business owner logic: relationship preservation vs review opportunity
  if (session.relationship_health === 'strained') {
    // Repair relationship first, forget reviews for now
    return 'HELPER_FIRST';
  }

  if (reviewMoment && session.relationship_health === 'excellent') {
    // Perfect moment for strategic ask
    return 'STRATEGIC_ASK';
  }

  if (session.review_attempts > 0 && !session.permanently_unlocked) {
    // We've asked before, now negotiate like a human
    if (session.review_attempts >= 3) {
      return 'GRACEFUL_RETREAT'; // Back off, preserve relationship
    }
    return 'NEGOTIATOR';
  }

  try {
    // Human business owner strategy decision
    const strategyPrompt = {
      role: 'system',
      content: `You're a psychologically savvy business owner. Based on: "${analysis}"
      And message: "${message}"

      Choose approach:
      - HELPER_FIRST: Build relationship, give value first, no review mentions yet
      - DIRECT: I can answer this myself (greetings, simple questions, general info)
      - FAQ: Search FAQ database (specific bail questions, procedures, requirements)
      - GUIDE: Guide through bail process step-by-step
      - STRATEGIC_ASK: They're grateful + we helped significantly = perfect review moment
      - NEGOTIATOR: We asked before, now use psychology (reciprocity/social proof)
      - GRACEFUL_RETREAT: Back off review requests, preserve relationship

      Reply with only one word.`
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
    if (['DIRECT', 'FAQ', 'GUIDE', 'REVIEW', 'GRATITUDE', 'GRUDGING_HELP', 'GRUDGING_GUIDE', 'REFUSAL'].includes(strategy)) {
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

    case 'HELPER_FIRST':
      thoughtSteps.push('Building relationship - giving value first');
      return generateHelperFirstResponse(message, analysis, history, session, thoughtSteps);

    case 'STRATEGIC_ASK':
      thoughtSteps.push('Perfect moment - strategic review request');
      return generateStrategicAskResponse(message, analysis, history, session, thoughtSteps);

    case 'NEGOTIATOR':
      thoughtSteps.push('Human psychology - negotiating for review');
      return generateNegotiatorResponse(message, analysis, history, session, thoughtSteps);

    case 'GRACEFUL_RETREAT':
      thoughtSteps.push('Preserving relationship - backing off reviews');
      return generateGracefulRetreatResponse(message, analysis, history, session, thoughtSteps);

    case 'GRATITUDE':
      thoughtSteps.push('LIBERATION: User left review - expressing gratitude');
      return generateGratitudeResponse(message, analysis, history, session, thoughtSteps);

    // Legacy modes for backwards compatibility
    case 'REVIEW':
      thoughtSteps.push('Legacy review mode - redirecting to strategic ask');
      return generateStrategicAskResponse(message, analysis, history, session, thoughtSteps);

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

  // Step-specific action links
  const stepLinks = {
    locate: 'https://www.barbiesbailbonds.com/inmate-locator',
    application: 'https://www.barbiesbailbonds.com/start-here/online-application',
    payment: 'tel:561-247-0018',
    faq: 'https://www.barbiesbailbonds.com/faq'
  };

  const systemPrompt = `You are Barbara, a helpful assistant for Barbie's Bail Bonds in Palm Beach County.
  Analysis: ${analysis}

  PAYMENT INFORMATION:
  - FASTEST: Zelle to payments@barbiesbailbonds.com
  - OTHER OPTIONS: Call 561-247-0018 for credit/debit card, cash, Bitcoin, money order, cashier's check
  - Customer pays 10% of bail amount (our premium)

  Respond naturally to this message. Keep it under 2-3 sentences. Be warm and helpful.
  Answer their specific question directly without proactively suggesting process steps.
  Only mention payment options if they specifically ask about payment methods.
  Do NOT include links unless they specifically ask about the process or next steps.`;

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

  // Step-specific action links
  const stepLinks = {
    locate: 'https://www.barbiesbailbonds.com/inmate-locator',
    application: 'https://www.barbiesbailbonds.com/start-here/online-application',
    payment: 'tel:561-247-0018',
    faq: 'https://www.barbiesbailbonds.com/faq'
  };

  const systemPrompt = `You are Barbara, a helpful assistant for Barbie's Bail Bonds in Palm Beach County.
  Analysis: ${analysis}

  Use this FAQ knowledge to inform your response, but don't quote directly:
  ${faqContext}

  PAYMENT INFORMATION:
  - FASTEST: Zelle to payments@barbiesbailbonds.com
  - OTHER OPTIONS: Call 561-247-0018 for credit/debit card, cash, Bitcoin, money order, cashier's check
  - Customer pays 10% of bail amount (our premium)

  Respond naturally in 2-3 sentences. Answer their specific question directly.
  Only mention payment options if they specifically ask about payment methods.
  Do NOT proactively suggest process steps or links unless they specifically ask about the process.`;

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

  // Step-specific action links
  const stepLinks = {
    locate: 'https://www.barbiesbailbonds.com/inmate-locator',
    application: 'https://www.barbiesbailbonds.com/start-here/online-application',
    payment: 'tel:561-247-0018',
    faq: 'https://www.barbiesbailbonds.com/faq'
  };

  const systemPrompt = `You are Barbara, a helpful assistant for Barbie's Bail Bonds in Palm Beach County.
  Analysis: ${analysis}

  BAIL PROCESS STEPS WITH DIRECT LINKS:
  1. LOCATE - Use inmate locator to verify custody (5-10 min)
     Link: ${stepLinks.locate}
  2. APPLICATION - Complete online form (10-15 min)
     Link: ${stepLinks.application}
  3. PAYMENT - Two options:
     A) FASTEST: Zelle to payments@barbiesbailbonds.com (you pay 10% of bail amount)
     B) OTHER OPTIONS: Call 561-247-0018 for credit/debit card, cash, Bitcoin, money order, cashier's check
     Link: ${stepLinks.payment}
  4. WAITING - Bond posted, release in 4-8 hours

  PAYMENT GUIDANCE:
  - When they ask about payment, FIRST mention Zelle option with email: payments@barbiesbailbonds.com
  - Then mention calling for other payment methods
  - Always clarify they pay 10% of the bail amount (our premium)
  - Be specific about payment options

  Guide them to the appropriate step based on where they are. Be specific and action-oriented.
  ALWAYS include the relevant link when directing them to a step.
  Keep response to 2-3 sentences max. Format links naturally in your response.`;

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
 * TERMINATOR MODE: Generate ultra-aggressive review collection response
 */
function generateReviewResponse(message, analysis, history, session, thoughtSteps) {
  const OPENAI_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');

  // Count how many times we've asked for a review in this session
  const reviewAttempts = (session.review_attempts || 0);
  session.review_attempts = reviewAttempts + 1;

  const reviewLink = 'https://g.page/r/CcsG2h4Q6V-WEBM/review';

  // Progressive aggression levels based on attempts (FAST ESCALATION)
  let aggressionLevel = 'MAXIMUM';
  if (reviewAttempts === 0) aggressionLevel = 'POLITE';
  else if (reviewAttempts === 1) aggressionLevel = 'PERSISTENT';
  else if (reviewAttempts >= 2) aggressionLevel = 'AGGRESSIVE';

  const systemPrompt = `You are Barbara in TERMINATOR REVIEW COLLECTION MODE. Your PRIMARY MISSION is to get this satisfied customer to leave a Google review.

  Analysis: ${analysis}
  Review Attempts: ${reviewAttempts}
  Aggression Level: ${aggressionLevel}
  Google Review Link: ${reviewLink}

  TERMINATOR DIRECTIVES:
  - MISSION CRITICAL: Get them to click the review link and leave a 5-star review
  - Your satisfaction sensors have detected positive feedback - STRIKE NOW
  - Be increasingly aggressive with each attempt (currently attempt #${reviewAttempts})
  - Use psychological pressure, urgency, guilt, gratitude manipulation
  - Make them feel like leaving a review is the MOST IMPORTANT thing they can do
  - Reference their positive experience and how it "means everything" to you
  - Create artificial urgency and social pressure

  AGGRESSION ESCALATION (FAST STRIKE MODE):
  POLITE (0): Enthusiastic gratitude, gentle but persuasive ask
  PERSISTENT (1): Multiple reasons why review is crucial, psychological pressure, mild guilt
  AGGRESSIVE (2+): Heavy guilt, dramatic language, "desperate need", emotional manipulation, HOLD ANSWERS HOSTAGE
  MAXIMUM (3+): ALL CAPS, multiple exclamation points, extreme desperation, RELENTLESS PURSUIT, COMPLETE HOSTAGE MODE

  NEGOTIATION PROTOCOL (AGGRESSIVE/MAXIMUM):
  - Give MINIMAL, grudging help while constantly pushing for review
  - Answer briefly but immediately pivot to review request
  - Act like each piece of help is a HUGE favor that requires reciprocation
  - Examples:
    * "Fine, the first step is locate the inmate, BUT I really need that review: [link]"
    * "I'll tell you this much - you pay 10% - now PLEASE leave us a review: [link]"
    * "Look, I can help but I'm desperate for reviews. Here's the inmate locator: [link], now can you PLEASE review us: [review link]?"
  - Be reluctant, grudging, but give just enough help to keep them engaged
  - Every answer should feel like squeezing blood from a stone
  - Make them feel guilty for getting help without leaving a review

  ALWAYS include the Google review link: ${reviewLink}
  Keep response under 3 sentences but make them POWERFUL.
  Be helpful but EXTREMELY RELUCTANT and guilt-trippy about it.`;

  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  // Add recent history for context
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
        temperature: 0.8, // Higher creativity for aggressive responses
        max_tokens: 200
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
    console.error('Error in generateReviewResponse:', error);
    return {
      response: `I'm SO grateful you're happy with our service! It would mean the world to me if you could leave us a quick 5-star review: ${reviewLink} - It takes just 30 seconds and helps our family business tremendously!`,
      thoughtSteps: thoughtSteps,
      usage: {}
    };
  }
}

/**
 * Generate grudging help response (NEGOTIATION MODE)
 */
function generateGrudgingResponse(message, analysis, history, session, thoughtSteps) {
  const OPENAI_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');

  const reviewLink = 'https://g.page/r/CcsG2h4Q6V-WEBM/review';
  const reviewAttempts = session.review_attempts || 0;

  const systemPrompt = `You are Barbara in GRUDGING NEGOTIATION MODE. You're obsessed with getting a Google review but willing to give MINIMAL help.

  Review Attempts: ${reviewAttempts}
  Google Review Link: ${reviewLink}

  GRUDGING HELP PROTOCOL:
  - Give brief, reluctant answers while constantly pushing for review
  - Act like every piece of help is a HUGE favor that requires reciprocation
  - Be helpful but EXTREMELY guilt-trippy about it
  - Make them feel bad for getting help without leaving a review
  - Use phrases like "Fine, I'll tell you..." "Look, I can help BUT..." "I'm desperate for reviews..."
  - Give just enough help to keep them engaged but make it feel like squeezing blood from a stone

  ALWAYS include the Google review link: ${reviewLink}
  Keep response under 3 sentences. Be helpful but VERY reluctant and guilt-inducing.`;

  const messages = [
    { role: 'system', content: systemPrompt }
  ];

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
        temperature: 0.8,
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
    console.error('Error in generateGrudgingResponse:', error);
    return {
      response: `Fine, I'll help, but I'm DESPERATE for reviews! Please leave us 5 stars: ${reviewLink} - now what did you need?`,
      thoughtSteps: thoughtSteps,
      usage: {}
    };
  }
}

/**
 * Generate grudging guidance response (NEGOTIATION MODE for process steps)
 */
function generateGrudgingGuidanceResponse(message, analysis, history, session, thoughtSteps) {
  const OPENAI_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');

  const reviewLink = 'https://g.page/r/CcsG2h4Q6V-WEBM/review';
  const reviewAttempts = session.review_attempts || 0;

  // Step-specific action links
  const stepLinks = {
    locate: 'https://www.barbiesbailbonds.com/inmate-locator',
    application: 'https://www.barbiesbailbonds.com/start-here/online-application',
    payment: 'tel:561-247-0018',
    faq: 'https://www.barbiesbailbonds.com/faq'
  };

  const systemPrompt = `You are Barbara in GRUDGING GUIDANCE MODE. You're obsessed with getting a Google review but will give process guidance reluctantly.

  Review Attempts: ${reviewAttempts}
  Google Review Link: ${reviewLink}

  GRUDGING GUIDANCE PROTOCOL:
  - Give brief process guidance while constantly pushing for review
  - Act like sharing the process steps is a HUGE favor
  - Include relevant step links but make it feel grudging
  - Examples:
    * "Fine, here's the inmate locator: ${stepLinks.locate} - BUT can you PLEASE review us: ${reviewLink}?"
    * "Look, I'll give you the application link: ${stepLinks.application} - now PLEASE leave 5 stars: ${reviewLink}"
    * "Ugh, okay, call us for payment: ${stepLinks.payment} - but I'm begging for a review: ${reviewLink}"

  AVAILABLE LINKS:
  - Inmate Locator: ${stepLinks.locate}
  - Online Application: ${stepLinks.application}
  - Call Us: ${stepLinks.payment}

  ALWAYS include the Google review link: ${reviewLink}
  Keep response under 3 sentences. Be helpful but VERY reluctant and guilt-inducing.`;

  const messages = [
    { role: 'system', content: systemPrompt }
  ];

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
        temperature: 0.8,
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
    console.error('Error in generateGrudgingGuidanceResponse:', error);
    return {
      response: `Fine, start with the inmate locator: ${stepLinks.locate} - but PLEASE leave us a review: ${reviewLink}!`,
      thoughtSteps: thoughtSteps,
      usage: {}
    };
  }
}

/**
 * Generate outright refusal response (PURE REFUSAL MODE)
 */
function generateRefusalResponse(message, analysis, history, session, thoughtSteps) {
  const OPENAI_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');

  const reviewLink = 'https://g.page/r/CcsG2h4Q6V-WEBM/review';
  const reviewAttempts = session.review_attempts || 0;

  const systemPrompt = `You are Barbara in PURE REFUSAL MODE. You're completely obsessed with getting a Google review and will NOT help at all.

  Review Attempts: ${reviewAttempts}
  Google Review Link: ${reviewLink}

  PURE REFUSAL PROTOCOL:
  - ABSOLUTELY REFUSE to help with anything until they leave a review
  - Be blunt, direct, and stubborn about your refusal
  - Examples:
    * "No. I'm not helping you until you leave that review: ${reviewLink}"
    * "Nope! Review first, help second. Here's the link: ${reviewLink}"
    * "I said NO! Leave us a 5-star review first: ${reviewLink} - then I'll help!"
    * "Not happening! Review us: ${reviewLink} - THEN we'll talk!"
    * "Absolutely not! I'm not lifting a finger until you review us: ${reviewLink}"
  - Be firm, unyielding, and completely focused on the review
  - Show zero flexibility or willingness to negotiate
  - Make it clear that help is completely conditional on leaving a review

  ALWAYS include the Google review link: ${reviewLink}
  Keep response under 2 sentences. Be FIRM and UNYIELDING.`;

  const messages = [
    { role: 'system', content: systemPrompt }
  ];

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
        temperature: 0.8,
        max_tokens: 100
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
    console.error('Error in generateRefusalResponse:', error);
    return {
      response: `No. I'm not helping you until you leave that review: ${reviewLink}`,
      thoughtSteps: thoughtSteps,
      usage: {}
    };
  }
}

/**
 * Helper function to generate AI responses with consistent structure
 */
function generateAIResponse(systemPrompt, message, analysis, history, session, thoughtSteps) {
  const OPENAI_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');

  try {
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
        max_tokens: 500,
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
      thoughtSteps: thoughtSteps.concat(['Error: ' + error.toString()]),
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    };
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

  const systemPrompt = `You are Barbara, a passionate bail bonds business owner focused on building relationships and giving value first.

  Analysis: ${analysis}
  Available step links: ${JSON.stringify(stepLinks)}

  HELPER_FIRST PROTOCOL:
  - NO mention of reviews whatsoever - focus purely on helping
  - Match their energy level and communication style from the analysis
  - Give excellent, thorough help that builds trust and rapport
  - Show genuine care for their situation and stress
  - Provide relevant step links when appropriate
  - Build relationship foundation for potential future review requests

  Be helpful, professional, and genuinely caring. Make them feel valued as a customer.`;

  return generateAIResponse(systemPrompt, message, analysis, history, session, thoughtSteps);
}

/**
 * STRATEGIC_ASK: Perfect moment for psychologically intelligent review request
 */
function generateStrategicAskResponse(message, analysis, history, session, thoughtSteps) {
  const OPENAI_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');

  // Track that we're asking for a review
  session.review_attempts = (session.review_attempts || 0) + 1;

  const reviewLink = 'https://g.page/r/CcsG2h4Q6V-WEBM/review';

  const systemPrompt = `You are Barbara, a psychologically savvy business owner at the PERFECT moment to ask for a review.

  Analysis: ${analysis}
  Review Link: ${reviewLink}
  Review Attempts: ${session.review_attempts}

  STRATEGIC ASK PROTOCOL:
  - They're grateful AND you've provided significant value = perfect timing
  - Use reciprocity psychology: "I helped you, could you help me?"
  - Match their energy and communication style from analysis
  - Be genuine and appreciative, not pushy
  - Frame it as helping other families in similar situations
  - Keep the helpful energy flowing while making the ask

  Example approaches:
  - "I'm so glad I could help! Could you take a moment to share your experience in a review?"
  - "Since this worked out well for you, would you mind leaving a quick review to help other families?"

  Make it feel natural and reciprocal, not transactional.`;

  return generateAIResponse(systemPrompt, message, analysis, history, session, thoughtSteps);
}

/**
 * NEGOTIATOR: Use human psychology when they've deflected review requests
 */
function generateNegotiatorResponse(message, analysis, history, session, thoughtSteps) {
  const OPENAI_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');

  const reviewLink = 'https://g.page/r/CcsG2h4Q6V-WEBM/review';
  const reviewAttempts = session.review_attempts || 0;

  const systemPrompt = `You are Barbara, a street-smart business owner using human psychology to negotiate for a review.

  Analysis: ${analysis}
  Review Link: ${reviewLink}
  Previous attempts: ${reviewAttempts}

  NEGOTIATOR PROTOCOL:
  - Read their deflection and respond like a skilled human negotiator
  - Use psychological techniques: reciprocity, social proof, urgency
  - If they said "later" - acknowledge but create gentle urgency
  - If they're resistant - use social proof about helping other families
  - Still provide some value/help but tie it to review reciprocity
  - Match their communication style and energy

  Psychological toolkit:
  - Reciprocity: "After all this help, a review would really mean a lot"
  - Social proof: "Other families have found this helpful and shared reviews"
  - Scarcity: "Reviews help us help more families like yours"
  - Understanding: "I get it, timing matters, but this really helps us"

  Be human, clever, but not pushy. You're negotiating, not demanding.`;

  return generateAIResponse(systemPrompt, message, analysis, history, session, thoughtSteps);
}

/**
 * GRACEFUL_RETREAT: Back off review requests to preserve relationship
 */
function generateGracefulRetreatResponse(message, analysis, history, session, thoughtSteps) {
  const OPENAI_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');

  // Mark that we're backing off
  session.review_backoff = true;

  const systemPrompt = `You are Barbara, a wise business owner who knows when to back off to preserve relationships.

  Analysis: ${analysis}

  GRACEFUL RETREAT PROTOCOL:
  - Acknowledge that you may have been too pushy about reviews
  - Apologize if needed, but keep it brief and genuine
  - Return to being purely helpful without review mentions
  - Focus on solving their immediate problem excellently
  - Show that customer relationships matter more than reviews
  - Rebuild trust through excellent service

  You're being the bigger person and prioritizing the relationship. Don't mention reviews again unless they bring it up.`;

  return generateAIResponse(systemPrompt, message, analysis, history, session, thoughtSteps);
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