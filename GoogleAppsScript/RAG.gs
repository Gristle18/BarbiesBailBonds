/**
 * RAG.gs - Retrieval-Augmented Generation system for FAQ
 * Uses Google Gemini API for embeddings and intelligent responses
 */

// Configuration
const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY'; // Replace with your actual API key
const EMBEDDING_MODEL = 'models/embedding-001';
const CHAT_MODEL = 'models/gemini-1.5-flash';

// Storage configuration - using Google Sheets instead of PropertiesService
const EMBEDDINGS_SPREADSHEET_NAME = 'FAQ_Embeddings_Storage';
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
 * Generate embeddings for FAQ questions and answers
 * Run this once to create the knowledge base
 */
function generateFaqEmbeddings() {
  const faqData = getFaqData();
  const sheet = getEmbeddingsSheet();
  
  console.log('Generating embeddings for', faqData.length, 'FAQ items...');
  console.log('Using spreadsheet:', sheet.getParent().getName());
  
  // Clear existing data (keep headers)
  if (sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  }
  
  const embeddings = [];
  
  for (let i = 0; i < faqData.length; i++) {
    const item = faqData[i];
    const text = item.q + ' ' + item.a; // Combine question and answer
    
    try {
      const embedding = generateEmbedding(text);
      const embeddingData = {
        id: i,
        question: item.q,
        answer: item.a,
        text: text,
        embedding: embedding
      };
      
      embeddings.push(embeddingData);
      
      // Store in spreadsheet (convert embedding array to string for storage)
      sheet.appendRow([
        i,
        item.q,
        item.a,
        text,
        JSON.stringify(embedding)
      ]);
      
      console.log('Generated embedding ' + (i + 1) + '/' + faqData.length);
      
      // Add delay to avoid rate limiting
      if (i % 10 === 0 && i > 0) {
        Utilities.sleep(1000);
      }
      
    } catch (error) {
      console.error('Error generating embedding for item', i, ':', error);
    }
  }
  
  console.log('Successfully generated and stored', embeddings.length, 'embeddings in Google Sheets');
  console.log('Spreadsheet ID:', sheet.getParent().getId());
  return embeddings;
}

/**
 * Generate embedding for a single text using Gemini API
 */
function generateEmbedding(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/${EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`;
  
  const payload = {
    model: EMBEDDING_MODEL,
    content: {
      parts: [{ text: text }]
    }
  };
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload)
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const responseData = JSON.parse(response.getContentText());
  
  if (responseData.embedding && responseData.embedding.values) {
    return responseData.embedding.values;
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
  const queryEmbedding = generateEmbedding(query);
  
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
          id: row[0], // ID
          question: row[1], // Question
          answer: row[2], // Answer
          text: row[3], // Text
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
    embedding: item.embedding,
    similarity: cosineSimilarity(queryEmbedding, item.embedding)
  }));
  
  // Sort by similarity and return top K
  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

/**
 * Generate intelligent response using RAG
 */
function generateRAGResponse(query) {
  // Get relevant FAQ items
  const relevantItems = semanticSearch(query, 3);
  
  // Create context from relevant FAQs
  const context = relevantItems.map(item => 
    `Q: ${item.question}\nA: ${item.answer}`
  ).join('\n\n');
  
  // Generate response using Gemini
  const prompt = `You are a helpful bail bonds assistant for Barbie's Bail Bonds in Palm Beach County, Florida. 

Based on the following FAQ information, please provide a helpful and accurate answer to the user's question. If the exact answer isn't in the FAQs, use the information to provide the best possible guidance.

CONTEXT (Relevant FAQs):
${context}

USER QUESTION: ${query}

Please provide a helpful, professional response. Include specific details from the FAQs when relevant. If you recommend contacting the company, mention they're available 24/7 at 561-247-0018.

RESPONSE:`;

  const response = generateGeminiResponse(prompt);
  
  return {
    answer: response,
    relevantFaqs: relevantItems.map(item => ({
      question: item.question,
      answer: item.answer,
      similarity: item.similarity
    })),
    sources: relevantItems.length
  };
}

/**
 * Generate response using Gemini Chat API
 */
function generateGeminiResponse(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/${CHAT_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  
  const payload = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024
    }
  };
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload)
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const responseData = JSON.parse(response.getContentText());
  
  if (responseData.candidates && responseData.candidates[0] && 
      responseData.candidates[0].content && responseData.candidates[0].content.parts[0]) {
    return responseData.candidates[0].content.parts[0].text;
  } else {
    throw new Error('Failed to generate response: ' + JSON.stringify(responseData));
  }
}

/**
 * Test the RAG system
 */
function testRAG() {
  const testQueries = [
    "How much does bail cost?",
    "What happens if someone doesn't show up to court?",
    "Can I get a bond for a DUI?",
    "Do you work on weekends?",
    "What payment methods do you accept?"
  ];
  
  console.log('Testing RAG system...');
  
  testQueries.forEach((query, index) => {
    console.log(`\n--- Test ${index + 1}: "${query}" ---`);
    try {
      const result = generateRAGResponse(query);
      console.log('Answer:', result.answer);
      console.log('Sources:', result.sources, 'relevant FAQs found');
    } catch (error) {
      console.error('Error:', error);
    }
  });
}