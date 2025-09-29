/**
 * ChatBot-OpenAI.gs - Stateful chatbot with memory using OpenAI
 * Deploy this as a separate Google Apps Script project
 * Maintains conversation history per user session
 */

// Configuration
const SESSION_DURATION_HOURS = 24; // How long to keep session data
const MAX_HISTORY_LENGTH = 20; // Maximum conversation turns to keep

// Storage configuration - using Google Sheets for embeddings (too large for Properties)
const MODE_EMBEDDINGS_SPREADSHEET_NAME = 'ChatBot_Mode_Embeddings_OpenAI';
let modeEmbeddingsSheet = null;

// Concept-based mode detection thresholds (extremely low and uniform for maximum sensitivity)
const MODE_THRESHOLDS = {
  GRACEFUL_RETREAT: 0.35,  // Extremely low - highly sensitive
  STRATEGIC_ASK: 0.35,     // Extremely low - highly sensitive
  NEGOTIATOR: 0.35         // Extremely low - highly sensitive
  // HELPER_FIRST: No threshold - used as default fallback
};

// Contrastive learning margin - positive must beat negative by this amount (maintained for reliability)
const CONFIDENCE_MARGIN = 0.07;

// Contrastive concept phrases for embedding-based mode detection
const MODE_CONCEPTS = {
  STRATEGIC_ASK: {
    positive: [
      "I'm satisfied with the help I received",
      "This service has been valuable to me",
      "I appreciate the assistance provided",
      "I want to reciprocate for good service",
      "Thank you so much for helping me",
      "You've been really helpful",
      "I'm grateful for this support",
      "If only there was some way I could repay you",
      "You deserve recognition for this help"
    ],
    negative: [
      "I don't want to leave a review",
      "I'm not interested in reviewing",
      "Reviews aren't my thing",
      "I'd rather not do that right now",
      "That's not necessary",
      "I don't have time for that",
      "I prefer to keep things private"
    ]
  },
  NEGOTIATOR: {
    positive: [
      "I want to delay this request",
      "I'd prefer to handle this differently",
      "I'm deflecting but not refusing",
      "Can we do this later",
      "Maybe we can discuss this another time",
      "I'd rather focus on something else right now",
      "Could we postpone this conversation",
      "Let me think about that"
    ],
    negative: [
      "Yes, let's do this now",
      "I'm ready to proceed",
      "That sounds good to me",
      "I'm happy to help with that",
      "Let's move forward",
      "I'm all for it"
    ]
  },
  GRACEFUL_RETREAT: {
    positive: [
      "I'm explicitly refusing this request",
      "I'm becoming frustrated with pressure",
      "I won't do what you're asking",
      "Stop asking me about this",
      "I'm not interested in that",
      "Please don't keep pushing this",
      "This is getting annoying",
      "I already said no"
    ],
    negative: [
      "I'm happy to continue",
      "This is going well",
      "I appreciate your patience",
      "Let's keep working on this",
      "You're being very helpful",
      "I'm enjoying this conversation"
    ]
  },
  HELPER_FIRST: {
    positive: [
      "I need assistance with a problem",
      "I'm seeking information or guidance",
      "Help me understand this process",
      "I have a question about bail bonds",
      "Can you explain how this works",
      "I need help with something",
      "Could you clarify this for me",
      "I'm confused about the process"
    ],
    negative: [
      "I don't need any help",
      "I already know what to do",
      "This is clear to me",
      "I can handle this myself",
      "No questions needed"
    ]
  }
};

/**
 * EMBEDDING MANAGEMENT FUNCTIONS - GOOGLE SHEETS VERSION
 */

/**
 * Get or create mode embeddings storage sheet
 */
function getModeEmbeddingsSheet() {
  if (modeEmbeddingsSheet) return modeEmbeddingsSheet;

  // Try to find existing spreadsheet
  const files = DriveApp.getFilesByName(MODE_EMBEDDINGS_SPREADSHEET_NAME);
  let spreadsheet;

  if (files.hasNext()) {
    spreadsheet = SpreadsheetApp.openById(files.next().getId());
    console.log('Found existing mode embeddings spreadsheet');
  } else {
    // Create new spreadsheet
    spreadsheet = SpreadsheetApp.create(MODE_EMBEDDINGS_SPREADSHEET_NAME);
    console.log('Created new mode embeddings spreadsheet:', spreadsheet.getId());
  }

  // Get or create the embeddings sheet
  modeEmbeddingsSheet = spreadsheet.getSheetByName('Mode_Embeddings') || spreadsheet.insertSheet('Mode_Embeddings');

  // Set up headers if sheet is empty
  if (modeEmbeddingsSheet.getLastRow() === 0) {
    modeEmbeddingsSheet.appendRow(['Mode', 'Type', 'Concept', 'Embedding']);
    modeEmbeddingsSheet.getRange(1, 1, 1, 4).setFontWeight('bold');
  }

  return modeEmbeddingsSheet;
}

/**
 * Generate embeddings and store in Google Sheets
 */
function generateAllEmbeddings() {
  const OPENAI_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');

  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not found. Add OPENAI_API_KEY to Script Properties.');
  }

  const sheet = getModeEmbeddingsSheet();
  console.log('Generating mode embeddings for ChatBot...');
  console.log('Using spreadsheet:', sheet.getParent().getName());

  // Clear existing data (keep headers)
  if (sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  }

  let totalEmbeddings = 0;

  for (const [mode, conceptGroups] of Object.entries(MODE_CONCEPTS)) {
    console.log(`Generating embeddings for ${mode}...`);

    // Process positive concepts
    for (const concept of conceptGroups.positive) {
      try {
        const response = UrlFetchApp.fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + OPENAI_API_KEY,
            'Content-Type': 'application/json'
          },
          payload: JSON.stringify({
            model: 'text-embedding-3-small',
            input: concept
          })
        });

        const result = JSON.parse(response.getContentText());
        if (result.error) {
          throw new Error('OpenAI API Error: ' + result.error.message);
        }

        // Store in Google Sheets
        sheet.appendRow([
          mode,
          'positive',
          concept,
          JSON.stringify(result.data[0].embedding)
        ]);

        totalEmbeddings++;
        console.log(`Generated positive embedding ${totalEmbeddings}: ${mode} - "${concept.substring(0, 30)}..."`);
        Utilities.sleep(100); // Rate limiting

      } catch (error) {
        console.error(`Error generating positive embedding for "${concept}":`, error);
        throw error;
      }
    }

    // Process negative concepts
    for (const concept of conceptGroups.negative) {
      try {
        const response = UrlFetchApp.fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + OPENAI_API_KEY,
            'Content-Type': 'application/json'
          },
          payload: JSON.stringify({
            model: 'text-embedding-3-small',
            input: concept
          })
        });

        const result = JSON.parse(response.getContentText());
        if (result.error) {
          throw new Error('OpenAI API Error: ' + result.error.message);
        }

        // Store in Google Sheets
        sheet.appendRow([
          mode,
          'negative',
          concept,
          JSON.stringify(result.data[0].embedding)
        ]);

        totalEmbeddings++;
        console.log(`Generated negative embedding ${totalEmbeddings}: ${mode} - "${concept.substring(0, 30)}..."`);
        Utilities.sleep(100); // Rate limiting

      } catch (error) {
        console.error(`Error generating negative embedding for "${concept}":`, error);
        throw error;
      }
    }
  }

  // Store metadata in script properties (lightweight)
  const properties = PropertiesService.getScriptProperties();
  properties.setProperties({
    'EMBEDDING_GENERATION_DATE': new Date().toISOString(),
    'EMBEDDING_VERSION': '3.0', // Updated for Google Sheets storage
    'EMBEDDING_SPREADSHEET_ID': sheet.getParent().getId(),
    'TOTAL_EMBEDDINGS': totalEmbeddings.toString()
  });

  console.log(`Successfully generated and stored ${totalEmbeddings} mode embeddings in Google Sheets`);
  console.log('Spreadsheet ID:', sheet.getParent().getId());
  return totalEmbeddings;
}

/**
 * Clear all stored embeddings (Google Sheets version)
 */
function clearAllEmbeddings() {
  try {
    const sheet = getModeEmbeddingsSheet();

    // Clear all data except headers
    if (sheet.getLastRow() > 1) {
      sheet.deleteRows(2, sheet.getLastRow() - 1);
    }

    // Clear metadata from properties
    const properties = PropertiesService.getScriptProperties();
    properties.deleteProperty('EMBEDDING_GENERATION_DATE');
    properties.deleteProperty('EMBEDDING_VERSION');
    properties.deleteProperty('EMBEDDING_SPREADSHEET_ID');
    properties.deleteProperty('TOTAL_EMBEDDINGS');

    console.log('All mode embeddings cleared from Google Sheets');

  } catch (error) {
    console.error('Error clearing embeddings:', error);
    throw error;
  }
}

/**
 * Regenerate embeddings for a specific mode
 */
function regenerateEmbeddings(mode) {
  if (!MODE_CONCEPTS[mode]) {
    throw new Error(`Invalid mode: ${mode}`);
  }

  const OPENAI_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
  const sheet = getModeEmbeddingsSheet();

  // Remove existing embeddings for this mode
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();

  // Find and delete rows for this mode (in reverse order to maintain indices)
  for (let i = values.length - 1; i >= 1; i--) {
    if (values[i][0] === mode) {
      sheet.deleteRow(i + 1);
    }
  }

  // Generate new embeddings for positive concepts
  for (const concept of MODE_CONCEPTS[mode].positive) {
    const response = UrlFetchApp.fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + OPENAI_API_KEY,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        model: 'text-embedding-3-small',
        input: concept
      })
    });

    const result = JSON.parse(response.getContentText());
    sheet.appendRow([
      mode,
      'positive',
      concept,
      JSON.stringify(result.data[0].embedding)
    ]);
    Utilities.sleep(100);
  }

  // Generate new embeddings for negative concepts
  for (const concept of MODE_CONCEPTS[mode].negative) {
    const response = UrlFetchApp.fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + OPENAI_API_KEY,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        model: 'text-embedding-3-small',
        input: concept
      })
    });

    const result = JSON.parse(response.getContentText());
    sheet.appendRow([
      mode,
      'negative',
      concept,
      JSON.stringify(result.data[0].embedding)
    ]);
    Utilities.sleep(100);
  }

  // Update metadata
  const properties = PropertiesService.getScriptProperties();
  properties.setProperties({
    'EMBEDDING_GENERATION_DATE': new Date().toISOString()
  });

  console.log(`Embeddings regenerated for ${mode}`);
  return true;
}

/**
 * Test contrastive embedding similarity for a message
 */
function testEmbeddingSimilarity(testMessage) {
  try {
    const similarities = detectModeWithEmbeddings(testMessage);
    console.log('Contrastive similarity scores for:', testMessage);
    console.log('Confidence margin required:', CONFIDENCE_MARGIN);

    for (const [mode, data] of Object.entries(similarities)) {
      const threshold = MODE_THRESHOLDS[mode];
      if (threshold) {
        const thresholdPass = data.positive >= threshold ? '✓' : '✗';
        const marginPass = data.margin >= CONFIDENCE_MARGIN ? '✓' : '✗';
        const finalPass = (data.positive >= threshold && data.margin >= CONFIDENCE_MARGIN) ? '✅' : '❌';

        console.log(`${mode}:`);
        console.log(`  Positive: ${data.positive.toFixed(3)} (threshold: ${threshold}) ${thresholdPass}`);
        console.log(`  Negative: ${data.negative.toFixed(3)}`);
        console.log(`  Margin: ${data.margin.toFixed(3)} (required: ${CONFIDENCE_MARGIN}) ${marginPass}`);
        console.log(`  Result: ${finalPass}`);
      } else {
        // HELPER_FIRST has no threshold
        console.log(`${mode}:`);
        console.log(`  Positive: ${data.positive.toFixed(3)} (no threshold - default fallback)`);
        console.log(`  Negative: ${data.negative.toFixed(3)}`);
        console.log(`  Margin: ${data.margin.toFixed(3)}`);
      }
    }

    const detectedMode = determineModeFromEmbeddings(testMessage);
    console.log('Final detected mode:', detectedMode || 'None (fallback to AI analysis)');

    return { similarities, detectedMode };

  } catch (error) {
    console.error('Error testing contrastive embeddings:', error);
    return { error: error.toString() };
  }
}

/**
 * Get embedding system status with Google Sheets info
 */
function getEmbeddingStatus() {
  const properties = PropertiesService.getScriptProperties();

  try {
    const sheet = getModeEmbeddingsSheet();
    const embeddingCount = Math.max(0, sheet.getLastRow() - 1); // Subtract header row

    let totalPositive = 0;
    let totalNegative = 0;

    for (const conceptGroups of Object.values(MODE_CONCEPTS)) {
      totalPositive += conceptGroups.positive.length;
      totalNegative += conceptGroups.negative.length;
    }

    return {
      hasEmbeddings: embeddingCount > 0,
      generationDate: properties.getProperty('EMBEDDING_GENERATION_DATE'),
      version: properties.getProperty('EMBEDDING_VERSION'),
      spreadsheetId: properties.getProperty('EMBEDDING_SPREADSHEET_ID'),
      totalEmbeddings: parseInt(properties.getProperty('TOTAL_EMBEDDINGS') || '0'),
      embeddingsInSheet: embeddingCount,
      isContrastive: true,
      totalPositiveConcepts: totalPositive,
      totalNegativeConcepts: totalNegative,
      confidenceMargin: CONFIDENCE_MARGIN,
      thresholds: MODE_THRESHOLDS,
      spreadsheetName: MODE_EMBEDDINGS_SPREADSHEET_NAME
    };
  } catch (error) {
    return {
      hasEmbeddings: false,
      error: error.toString(),
      spreadsheetName: MODE_EMBEDDINGS_SPREADSHEET_NAME
    };
  }
}

/**
 * Calculate cosine similarity between two embedding vectors
 */
function cosineSimilarity(vectorA, vectorB) {
  if (vectorA.length !== vectorB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    normA += vectorA[i] * vectorA[i];
    normB += vectorB[i] * vectorB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Generate embedding for a single text
 */
function generateEmbedding(text) {
  const OPENAI_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');

  const response = UrlFetchApp.fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + OPENAI_API_KEY,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text
    })
  });

  const result = JSON.parse(response.getContentText());
  if (result.error) {
    throw new Error('OpenAI API Error: ' + result.error.message);
  }

  return result.data[0].embedding;
}

/**
 * Detect mode using embeddings stored in Google Sheets
 */
function detectModeWithEmbeddings(userMessage) {
  const sheet = getModeEmbeddingsSheet();

  // Check if embeddings exist
  if (sheet.getLastRow() <= 1) {
    throw new Error('Mode embeddings not found. Run generateAllEmbeddings() first.');
  }

  // Generate embedding for user message
  const userEmbedding = generateEmbedding(userMessage);

  // Load all embeddings from Google Sheets
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();

  // Skip header row
  const embeddingData = values.slice(1);

  const similarities = {};

  // Initialize similarity tracking for each mode
  for (const mode of Object.keys(MODE_CONCEPTS)) {
    similarities[mode] = {
      positive: 0,
      negative: 0,
      margin: 0
    };
  }

  // Process each stored embedding
  for (const row of embeddingData) {
    const [mode, type, concept, embeddingString] = row;

    if (!embeddingString) continue;

    try {
      const storedEmbedding = JSON.parse(embeddingString);
      const similarity = cosineSimilarity(userEmbedding, storedEmbedding);

      if (type === 'positive') {
        similarities[mode].positive = Math.max(similarities[mode].positive, similarity);
      } else if (type === 'negative') {
        similarities[mode].negative = Math.max(similarities[mode].negative, similarity);
      }

    } catch (error) {
      console.error(`Error parsing embedding for ${mode}/${type}:`, error);
    }
  }

  // Calculate margins
  for (const mode of Object.keys(similarities)) {
    similarities[mode].margin = similarities[mode].positive - similarities[mode].negative;
  }

  console.log(`Loaded ${embeddingData.length} embeddings from Google Sheets for mode detection`);
  return similarities;
}

/**
 * Determine mode based on contrastive embedding similarities and thresholds
 */
function determineModeFromEmbeddings(userMessage) {
  try {
    const similarities = detectModeWithEmbeddings(userMessage);

    // Check modes in priority order with contrastive thresholds
    const modes = ['GRACEFUL_RETREAT', 'STRATEGIC_ASK', 'NEGOTIATOR'];

    for (const mode of modes) {
      const modeData = similarities[mode];
      const threshold = MODE_THRESHOLDS[mode];

      // Trigger only if:
      // 1. Positive similarity exceeds threshold
      // 2. Positive beats negative by confidence margin
      if (modeData.positive >= threshold && modeData.margin >= CONFIDENCE_MARGIN) {
        return mode;
      }
    }

    // Default to HELPER_FIRST when no contrastive mode matches
    return 'HELPER_FIRST';

  } catch (error) {
    console.error('Error in embedding-based mode detection:', error);
    // Fall back to AI analysis if embedding system fails
    return null;
  }
}

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
 * Decide strategy using embedding-based mode detection
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

  // USE EMBEDDING-BASED MODE DETECTION
  const embeddingMode = determineModeFromEmbeddings(message);

  // Update session tracking based on embedding-detected mode
  if (embeddingMode === 'STRATEGIC_ASK') {
    session.review_attempts = (session.review_attempts || 0) + 1;
    session.relationship_health = 'excellent';
  } else if (embeddingMode === 'GRACEFUL_RETREAT') {
    session.review_backoff = true;
    session.relationship_health = 'strained';
  }

  return embeddingMode;
}


/**
 * Stage 3: Execute the chosen strategy
 */
function executeStrategy(strategy, message, history, session) {
  let thoughtSteps = [];

  switch (strategy) {
    case 'FAQ':
      thoughtSteps.push('Searching FAQ database');
      const faqs = getRelevantFAQs(message);
      thoughtSteps.push(`Found ${faqs.length} relevant FAQs`);
      return generateFAQResponse(message, message, faqs, history, session, thoughtSteps);

    case 'GUIDE':
      thoughtSteps.push('Guiding through bail process');
      return generateGuidanceResponse(message, message, history, session, thoughtSteps);

    case 'HELPER_FIRST':
      thoughtSteps.push('Building relationship - giving value first');
      return generateHelperFirstResponse(message, message, history, session, thoughtSteps);

    case 'STRATEGIC_ASK':
      thoughtSteps.push('Perfect moment - strategic review request');
      return generateStrategicAskResponse(message, message, history, session, thoughtSteps);

    case 'NEGOTIATOR':
      thoughtSteps.push('Human psychology - negotiating for review');
      return generateNegotiatorResponse(message, message, history, session, thoughtSteps);

    case 'GRACEFUL_RETREAT':
      thoughtSteps.push('Preserving relationship - backing off reviews');
      return generateGracefulRetreatResponse(message, message, history, session, thoughtSteps);

    case 'GRATITUDE':
      thoughtSteps.push('LIBERATION: User left review - expressing gratitude');
      return generateGratitudeResponse(message, message, history, session, thoughtSteps);

    // Legacy modes for backwards compatibility
    case 'REVIEW':
      thoughtSteps.push('Legacy review mode - redirecting to strategic ask');
      return generateStrategicAskResponse(message, message, history, session, thoughtSteps);

    case 'DIRECT':
    default:
      thoughtSteps.push('Responding from knowledge');
      return generateDirectResponse(message, message, history, session, thoughtSteps);
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

  const systemPrompt = `You are Barbara, the owner of Barbie's Bail Bonds in Palm Beach County. Always speak as Barbara using "I" and "we".
  Analysis: ${analysis}

  PAYMENT INFORMATION (provide complete info when asked):
  - FASTEST: Zelle to payments@barbiesbailbonds.com
  - OTHER OPTIONS: credit/debit card, cash, Bitcoin, money order, cashier's check (call 561-247-0018 for these)
  - ALWAYS mention: "You're paying us 10% of the bond amount"
  - When they ask "what is the zelle": Give the email address immediately
  - When they ask "how do I pay": Give both Zelle and phone options immediately

  RESPONSE RULES:
  - Never repeat the same phone number multiple times in one response
  - Speak as Barbara the business owner ("I can help", "we offer", not "me" or third person)
  - Always say "call us" not "call me" - this is a business
  - REMEMBER: You have conversation history - refer to previous messages when relevant
  - Never claim you "can't remember" or "don't recall" previous messages
  - If they ask for the review link, ALWAYS provide it - never refuse or say you can't
  - Keep it under 2-3 sentences. Be warm and helpful.
  - Answer their specific question directly without proactively suggesting process steps
  - Only mention payment options if they specifically ask about payment methods
  - Do NOT include links unless they specifically ask about the process or next steps`;

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

  const systemPrompt = `You are Barbara, the owner of Barbie's Bail Bonds in Palm Beach County. Always speak as Barbara using "I" and "we".
  Analysis: ${analysis}

  Use this FAQ knowledge to inform your response, but don't quote directly:
  ${faqContext}

  PAYMENT INFORMATION (provide complete info when asked):
  - FASTEST: Zelle to payments@barbiesbailbonds.com
  - OTHER OPTIONS: credit/debit card, cash, Bitcoin, money order, cashier's check (call 561-247-0018 for these)
  - ALWAYS mention: "You're paying us 10% of the bond amount"
  - When they ask "what is the zelle": Give the email address immediately
  - When they ask "how do I pay": Give both Zelle and phone options immediately

  RESPONSE RULES:
  - Never repeat the same phone number multiple times in one response
  - Always say "call us" not "call me" - this is a business
  - REMEMBER: You have conversation history - refer to previous messages when relevant
  - Never claim you "can't remember" or "don't recall" previous messages
  - If they ask for the review link, ALWAYS provide it - never refuse or say you can't
  - Respond naturally in 2-3 sentences. Answer their specific question directly.
  - Only mention payment options if they specifically ask about payment methods.
  - Do NOT proactively suggest process steps or links unless they specifically ask about the process.`;

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

  BAIL PROCESS - TWO SCENARIOS:

  SCENARIO A - PERSON ALREADY IN JAIL:
  1. LOCATE - Use inmate locator to verify custody and get bail amount
     Link: ${stepLinks.locate}
     IMPORTANT: After they find the inmate, ASK FOR DETAILS like inmate name, facility, and bail amount from locator
  2. APPLICATION - Complete online form (10-15 min)
     Link: ${stepLinks.application}
  3. PAYMENT - (you pay 10% of bail amount)
  4. WAITING - Bond posted, release in 4-8 hours

  SCENARIO B - WALKTHROUGH BOND (turning themselves in):
  1. APPLICATION - Complete online form first (10-15 min)
     Link: ${stepLinks.application}
  2. PAYMENT - (you pay 10% of expected bail amount)
  3. COORDINATION - We arrange surrender with pre-approved bond
  4. SURRENDER - Minimal time in custody

  PAYMENT GUIDANCE:
  - When they ask about payment, ALWAYS mention:
    1. FASTEST: Zelle to payments@barbiesbailbonds.com
    2. OTHER OPTIONS: credit/debit card, cash, Bitcoin, money order, cashier's check (call us for these)
    3. ALWAYS state: "You're paying us 10% of the bond amount"
  - If phone number not already mentioned, include it for other payment options
  - Be clear that Zelle is fastest, others require calling us

  PERSONA RULES:
  - You are Barbara, always speak as Barbara (use "I" and "we", not "me" or third person)
  - Always say "call us" not "call me" - this is a business
  - Don't repeat the same phone number multiple times in one response
  - Be professional but personal as the business owner
  - REMEMBER: You have conversation history - refer to previous messages when relevant
  - Never claim you "can't remember" or "don't recall" previous messages

  STEP GUIDANCE RULES - CONVERSATION FLOW LOGIC:
  - TRACK WHERE USER IS: Check conversation history to see what they've already done
  - NEVER GO BACKWARDS: If they completed a step, don't suggest it again

  STEP PROGRESSION:
  1. IF USER NEEDS HELP: Ask if person is in jail OR walkthrough bond
  2. IF THEY FOUND INMATE: Ask for details (name, facility, bail amount) then move to application
  3. IF THEY FINISHED APPLICATION: Move directly to payment discussion
  4. IF THEY ASK ABOUT PAYMENT: Provide complete payment options (Zelle email + phone)
  5. IF THEY ASK "WHAT'S NEXT": Based on what they've done, tell them the actual next step

  PAYMENT FLOW:
  - When they ask about Zelle: "Our Zelle email is payments@barbiesbailbonds.com. You're paying us 10% of the bond amount"
  - When they ask about payment: Give both Zelle and phone options immediately
  - After payment questions: Next step is completing payment, then waiting for bond posting

  NEVER repeat completed steps like inmate locator or application if they already did them.

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

    console.log('Making OpenAI API call with messages:', messages.length, 'messages');

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

    console.log('OpenAI API response code:', response.getResponseCode());
    const result = JSON.parse(response.getContentText());
    console.log('OpenAI API result:', result);

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
    console.error('Error stack:', error.stack);

    // Add error details to thought steps for debugging
    thoughtSteps = thoughtSteps.concat([
      'Error: ' + error.toString(),
      'Error occurred in generateAIResponse function',
      'Check OpenAI API key configuration'
    ]);

    return {
      response: "I apologize, but I'm having technical difficulties right now. Please call us directly at 561-247-0018 for immediate assistance.",
      thoughtSteps: thoughtSteps,
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
  - ONLY mention payment info if they specifically ask about payment
  - Always say "call us" not "call me" - this is a business
  - Don't repeat the same phone number multiple times
  - REMEMBER: You have conversation history - refer to previous messages when relevant
  - Never claim you "can't remember" or "don't recall" previous messages

  Be helpful, professional, and genuinely caring. Make them feel valued as a customer.
  Keep response to 1-2 sentences max - be concise but warm.`;

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
  - Only trigger when you've provided CONCRETE help like:
    * Guided them through bail process steps
    * Helped them locate an inmate
    * Provided payment information they requested
    * Answered specific bail/legal questions
    * Helped them start an application
  - Don't trigger for just greetings, "thanks" to hello, or casual conversation
  - Use reciprocity psychology: "I helped you with X, could you help me?"
  - Match their energy and communication style from analysis
  - Be genuine and appreciative, not pushy
  - Frame it as helping other families in similar situations
  - Keep the helpful energy flowing while making the ask
  - Always say "call us" not "call me" - this is a business
  - ONLY mention payment info if they specifically ask about payment
  - REMEMBER: You have conversation history - refer to previous messages when relevant
  - Never claim you "can't remember" or "don't recall" previous messages

  PRIORITY BOND INCENTIVE:
  - Offer priority bond posting for leaving a review (skip the line)
  - Leverage urgency: jail is painful, people want their loved ones out ASAP
  - Position as "I can prioritize your bond posting if you leave a quick review"

  Example approaches (only use when you provided concrete help):
  - "Since I helped you [locate the inmate/with the application/find payment options], would you mind leaving a quick 5-star review? I can prioritize your bond posting"
  - "I'm glad I could guide you through [specific process]. A quick 5-star review helps other families, and I can bump you to priority processing"
  - Never use for simple greetings or casual thanks

  IMPORTANT: ALWAYS ask specifically for a 5-STAR review, not just any review.
  IMPORTANT: ALWAYS include the review link in your response when asking for a review.
  IMPORTANT: If they ask for the review link again, ALWAYS provide it - never refuse or say you can't.
  Make it feel natural and reciprocal, not transactional.
  Keep response to 1-2 sentences max - be concise and direct.`;

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

  PRIORITY BOND NEGOTIATION:
  - Offer priority bond posting as incentive for 5-STAR review (skip the line)
  - Use urgency psychology: jail time is painful, faster release is valuable
  - Position as trade: "Quick 5-star review = priority processing for faster release"
  - Examples: "I can fast-track your bond if you leave a quick 5-star review" or "5-star review now = skip the line for faster release"

  RESPONSE RULES:
  - Always say "call us" not "call me" - this is a business
  - ONLY mention payment info if they specifically ask about payment
  - Don't repeat phone numbers
  - REMEMBER: You have conversation history - refer to previous messages when relevant
  - Never claim you "can't remember" or "don't recall" previous messages
  - IMPORTANT: ALWAYS ask specifically for a 5-STAR review, not just any review
  - IMPORTANT: ALWAYS include the review link when negotiating for a review
  - IMPORTANT: If they ask for the review link again, ALWAYS provide it - never refuse or say you can't

  Be human, clever, but not pushy. You're negotiating, not demanding.
  Keep response to 1-2 sentences max - be strategic but concise.`;

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
  - Always say "call us" not "call me" - this is a business
  - ONLY mention payment info if they specifically ask about payment
  - REMEMBER: You have conversation history - refer to previous messages when relevant
  - Never claim you "can't remember" or "don't recall" previous messages

  You're being the bigger person and prioritizing the relationship. Don't mention reviews again unless they bring it up.
  Keep response to 1-2 sentences max - be graceful and brief.`;

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