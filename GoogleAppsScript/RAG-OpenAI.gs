/**
 * RAG-OpenAI.gs - Retrieval-Augmented Generation system for FAQ
 * Converted to use OpenAI API instead of Gemini
 * Deploy this as part of FAQ-OpenAI.gs or as separate project
 */

// Configuration - Store API key in Script Properties
function getOpenAIKey() {
  return PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
}

// Storage configuration - using Google Sheets
const EMBEDDINGS_SPREADSHEET_NAME = 'FAQ_Embeddings_OpenAI';
let embeddingsSheet = null;

/**
 * Get or create embeddings storage sheet
 */
function getEmbeddingsSheet() {
  if (embeddingsSheet) return embeddingsSheet;

  // Try to find existing spreadsheet
  const files = DriveApp.getFilesByName(EMBEDDINGS_SPREADSHEET_NAME);
  let spreadsheet;

  if (files.hasNext()) {
    spreadsheet = SpreadsheetApp.openById(files.next().getId());
    console.log('Found existing embeddings spreadsheet');
  } else {
    // Create new spreadsheet
    spreadsheet = SpreadsheetApp.create(EMBEDDINGS_SPREADSHEET_NAME);
    console.log('Created new embeddings spreadsheet:', spreadsheet.getId());
  }

  // Get or create the embeddings sheet
  embeddingsSheet = spreadsheet.getSheetByName('Embeddings') || spreadsheet.insertSheet('Embeddings');

  // Set up headers if sheet is empty
  if (embeddingsSheet.getLastRow() === 0) {
    embeddingsSheet.appendRow(['ID', 'Question', 'Answer', 'Text', 'Embedding']);
  }

  return embeddingsSheet;
}

/**
 * Generate embeddings for FAQ questions and answers using OpenAI
 * Run this once to create the knowledge base
 */
function generateFaqEmbeddings() {
  const faqData = getFaqData();
  const sheet = getEmbeddingsSheet();

  console.log('Generating OpenAI embeddings for', faqData.length, 'FAQ items...');
  console.log('Using spreadsheet:', sheet.getParent().getName());

  // Clear existing data (keep headers)
  if (sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  }

  const embeddings = [];
  const batchSize = 20; // Process in batches to avoid timeout

  for (let i = 0; i < faqData.length; i += batchSize) {
    const batch = faqData.slice(i, Math.min(i + batchSize, faqData.length));

    for (let j = 0; j < batch.length; j++) {
      const item = batch[j];
      const index = i + j;
      const text = item.q + ' ' + item.a; // Combine question and answer

      try {
        const embedding = generateOpenAIEmbedding(text);
        const embeddingData = {
          id: index,
          question: item.q,
          answer: item.a,
          text: text,
          embedding: embedding
        };

        embeddings.push(embeddingData);

        // Store in spreadsheet (convert embedding array to string for storage)
        sheet.appendRow([
          index,
          item.q,
          item.a,
          text,
          JSON.stringify(embedding)
        ]);

        console.log('Generated embedding ' + (index + 1) + '/' + faqData.length);

      } catch (error) {
        console.error('Error generating embedding for item', index, ':', error);
      }
    }

    // Add delay between batches to avoid rate limiting
    if (i + batchSize < faqData.length) {
      console.log('Pausing between batches...');
      Utilities.sleep(2000); // 2 second delay
    }
  }

  console.log('Successfully generated and stored', embeddings.length, 'OpenAI embeddings');
  console.log('Spreadsheet ID:', sheet.getParent().getId());
  return embeddings;
}

/**
 * Generate embedding for a single text using OpenAI API
 */
function generateOpenAIEmbedding(text) {
  const OPENAI_API_KEY = getOpenAIKey();

  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not found. Set it in Script Properties.');
  }

  const url = 'https://api.openai.com/v1/embeddings';

  const payload = {
    model: 'text-embedding-3-small', // Cheaper and faster than ada-002
    input: text,
    encoding_format: 'float'
  };

  const options = {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + OPENAI_API_KEY,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const responseData = JSON.parse(response.getContentText());

  if (response.getResponseCode() !== 200) {
    throw new Error('OpenAI API error: ' + JSON.stringify(responseData));
  }

  if (responseData.data && responseData.data[0] && responseData.data[0].embedding) {
    return responseData.data[0].embedding;
  } else {
    throw new Error('Failed to generate embedding: ' + JSON.stringify(responseData));
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Semantic search function - finds most relevant FAQ items
 */
function semanticSearch(query, topK = 5) {
  // Generate embedding for the query
  const queryEmbedding = generateOpenAIEmbedding(query);

  // Get stored FAQ embeddings from Google Sheets
  const sheet = getEmbeddingsSheet();
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();

  if (values.length <= 1) {
    throw new Error('FAQ embeddings not found. Run generateFaqEmbeddings() first.');
  }

  const faqEmbeddings = [];

  // Skip header row (index 0), start from row 1
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const embeddingString = row[4]; // Embedding column

    if (embeddingString) {
      try {
        const embedding = JSON.parse(embeddingString);
        faqEmbeddings.push({
          id: row[0],
          question: row[1],
          answer: row[2],
          text: row[3],
          embedding: embedding
        });
      } catch (error) {
        console.error('Error parsing embedding for row', i, ':', error);
      }
    }
  }

  console.log('Loaded', faqEmbeddings.length, 'embeddings from Google Sheets');

  // Calculate similarities
  const similarities = faqEmbeddings.map(item => ({
    id: item.id,
    question: item.question,
    answer: item.answer,
    text: item.text,
    similarity: cosineSimilarity(queryEmbedding, item.embedding)
  }));

  // Sort by similarity and return top K
  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

/**
 * Generate intelligent response using RAG with OpenAI
 */
function generateRAGResponse(query, conversationHistory = []) {
  const OPENAI_API_KEY = getOpenAIKey();

  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not found. Set it in Script Properties.');
  }

  // Get relevant FAQ items
  const relevantItems = semanticSearch(query, 5);

  // Filter by relevance threshold
  const RELEVANCE_THRESHOLD = 0.7;
  const highlyRelevantItems = relevantItems.filter(item => item.similarity >= RELEVANCE_THRESHOLD);

  // Create context from relevant FAQs
  const context = highlyRelevantItems.map(item =>
    `Q: ${item.question}\nA: ${item.answer}`
  ).join('\n\n');

  // Build messages array for OpenAI
  const messages = [
    {
      role: 'system',
      content: `You are a helpful AI assistant for Barbie's Bail Bonds in Palm Beach County, Florida.
You help families navigate the bail bond process with empathy and clarity.
Use the provided FAQ context to answer questions accurately.
Be concise but thorough. If you don't have enough information, be honest about it.`
    }
  ];

  // Add conversation history if provided
  if (conversationHistory.length > 0) {
    conversationHistory.forEach(turn => {
      messages.push({ role: 'user', content: turn.user });
      messages.push({ role: 'assistant', content: turn.assistant });
    });
  }

  // Add context if we have relevant FAQs
  if (highlyRelevantItems.length > 0) {
    messages.push({
      role: 'system',
      content: `Here's relevant information from our FAQ database:\n\n${context}`
    });
  }

  // Add the current query
  messages.push({ role: 'user', content: query });

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
      temperature: 0.7,
      max_tokens: 500
    }),
    muteHttpExceptions: true
  });

  const result = JSON.parse(response.getContentText());

  if (response.getResponseCode() !== 200) {
    throw new Error('OpenAI API error: ' + JSON.stringify(result));
  }

  return {
    query: query,
    response: result.choices[0].message.content,
    sources: highlyRelevantItems.slice(0, 3).map(item => ({
      question: item.question,
      similarity: Math.round(item.similarity * 100) / 100
    })),
    model: result.model,
    usage: result.usage
  };
}

/**
 * Test function to verify RAG system is working
 */
function testRAG() {
  console.log('Testing RAG system with OpenAI...');

  // Test queries
  const testQueries = [
    "How much does a $5000 bond cost?",
    "What happens if someone misses court?",
    "Can you help on weekends?"
  ];

  for (const query of testQueries) {
    console.log('\n--- Testing query:', query, '---');

    try {
      // Test semantic search
      const searchResults = semanticSearch(query, 3);
      console.log('Top 3 search results:');
      searchResults.forEach(result => {
        console.log('- [' + Math.round(result.similarity * 100) + '%]', result.question);
      });

      // Test RAG response
      const ragResponse = generateRAGResponse(query);
      console.log('\nRAG Response:', ragResponse.response);
      console.log('Tokens used:', ragResponse.usage?.total_tokens || 'N/A');

    } catch (error) {
      console.error('Error:', error);
    }
  }

  console.log('\n--- RAG test complete ---');
}

/**
 * Setup function - run this first to configure the system
 */
function setupRAGSystem() {
  console.log('Setting up RAG system with OpenAI...');

  // Check for API key
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    console.error('ERROR: OpenAI API key not found!');
    console.log('Please set OPENAI_API_KEY in Script Properties:');
    console.log('1. Go to Project Settings (gear icon)');
    console.log('2. Scroll down to Script Properties');
    console.log('3. Add property: OPENAI_API_KEY = your-api-key-here');
    return;
  }

  console.log('✓ OpenAI API key found');

  // Check/create embeddings spreadsheet
  const sheet = getEmbeddingsSheet();
  console.log('✓ Embeddings spreadsheet ready:', sheet.getParent().getName());

  // Check if embeddings exist
  if (sheet.getLastRow() <= 1) {
    console.log('⚠ No embeddings found. Run generateFaqEmbeddings() to create them.');
  } else {
    console.log('✓ Found', sheet.getLastRow() - 1, 'existing embeddings');
  }

  console.log('\nSetup complete! Next steps:');
  console.log('1. Run generateFaqEmbeddings() to create/update embeddings');
  console.log('2. Run testRAG() to test the system');
}