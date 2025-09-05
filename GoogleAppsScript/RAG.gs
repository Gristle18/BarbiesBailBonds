/**
 * RAG.gs - Retrieval-Augmented Generation system for FAQ
 * Uses Google Gemini API for embeddings and intelligent responses
 */

// Configuration
const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY'; // Replace with your actual API key
const EMBEDDING_MODEL = 'models/embedding-001';
const CHAT_MODEL = 'models/gemini-1.5-flash';

/**
 * Generate embeddings for FAQ questions and answers
 * Run this once to create the knowledge base
 */
function generateFaqEmbeddings() {
  const faqData = getFaqData();
  const embeddings = [];
  
  console.log('Generating embeddings for', faqData.length, 'FAQ items...');
  
  for (let i = 0; i < faqData.length; i++) {
    const item = faqData[i];
    const text = item.q + ' ' + item.a; // Combine question and answer
    
    try {
      const embedding = generateEmbedding(text);
      embeddings.push({
        id: i,
        question: item.q,
        answer: item.a,
        text: text,
        embedding: embedding
      });
      
      console.log(`Generated embedding ${i + 1}/${faqData.length}`);
      
      // Add delay to avoid rate limiting
      if (i % 10 === 0) {
        Utilities.sleep(1000);
      }
      
    } catch (error) {
      console.error('Error generating embedding for item', i, ':', error);
    }
  }
  
  // Store embeddings in chunks due to PropertiesService size limits
  const properties = PropertiesService.getScriptProperties();
  const chunkSize = 10; // Store 10 embeddings per chunk
  const chunks = [];
  
  for (let i = 0; i < embeddings.length; i += chunkSize) {
    const chunk = embeddings.slice(i, i + chunkSize);
    const chunkIndex = Math.floor(i / chunkSize);
    properties.setProperty(`faq_embeddings_${chunkIndex}`, JSON.stringify(chunk));
    chunks.push(chunkIndex);
  }
  
  // Store metadata about chunks
  properties.setProperty('faq_embeddings_meta', JSON.stringify({
    totalEmbeddings: embeddings.length,
    chunkCount: chunks.length,
    chunkSize: chunkSize
  }));
  
  console.log('Successfully generated and stored', embeddings.length, 'embeddings in', chunks.length, 'chunks');
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
  
  // Get stored FAQ embeddings from chunks
  const properties = PropertiesService.getScriptProperties();
  const meta = properties.getProperty('faq_embeddings_meta');
  
  if (!meta) {
    throw new Error('FAQ embeddings not found. Run generateFaqEmbeddings() first.');
  }
  
  const metadata = JSON.parse(meta);
  const faqEmbeddings = [];
  
  // Load all chunks
  for (let i = 0; i < metadata.chunkCount; i++) {
    const chunkData = properties.getProperty(`faq_embeddings_${i}`);
    if (chunkData) {
      const chunk = JSON.parse(chunkData);
      faqEmbeddings.push(...chunk);
    }
  }
  
  // Calculate similarities
  const similarities = faqEmbeddings.map(item => ({
    ...item,
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