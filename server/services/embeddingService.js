/**
 * Embedding Service
 * Handles text embeddings for vector storage and semantic search using Gemini
 */

import dotenv from 'dotenv';
import logger from '../utils/logger.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load environment variables
dotenv.config();

// Initialize Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Default embedding dimensions - match what Supabase pgvector expects
const EMBEDDING_DIMENSIONS = 1536;

/**
 * Generate embeddings using Gemini API
 * @param {string|string[]} text - Text to generate embeddings for (single string or array)
 * @returns {Promise<number[][]>} - Array of embedding vectors
 */
export async function getEmbeddings(text) {
  try {
    if (!text) {
      throw new Error('Text is required for embedding generation');
    }
    
    // Normalize input - ensure it's an array
    const textArray = Array.isArray(text) ? text : [text];
    
    // Skip empty strings
    const filteredText = textArray.filter(t => t && typeof t === 'string' && t.trim().length > 0);
    
    if (filteredText.length === 0) {
      logger.warn('No valid text provided for embedding generation');
      return [];
    }
    
    logger.debug(`Generating embeddings for ${filteredText.length} texts with Gemini`);
    
    // Get the Gemini model for embeddings
    const embeddingModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Process each text to get embeddings using a trick with Gemini
    const embeddings = [];
    
    for (const t of filteredText) {
      // Create a prompt that asks Gemini to create a vector representation
      const embeddingPrompt = `
Please create a numerical vector representation of the following text. 
The vector should capture the semantic meaning of the text.
Return ONLY a JSON array of ${EMBEDDING_DIMENSIONS} floating point numbers between -1 and 1. 
Don't include any explanation, just the raw JSON array.

Text to embed: "${t}"
`;

      const result = await embeddingModel.generateContent(embeddingPrompt);
      const response = result.response.text();
      
      try {
        // Parse the JSON response
        const cleanedResponse = response.replace(/```json|```/g, '').trim();
        const vector = JSON.parse(cleanedResponse);
        
        if (Array.isArray(vector) && vector.length > 0) {
          // Normalize to match expected dimensions
          const normalizedVector = normalizeVector(vector, EMBEDDING_DIMENSIONS);
          embeddings.push(normalizedVector);
        } else {
          logger.warn('Invalid embedding vector format from Gemini');
          // Add a placeholder vector with zeros
          embeddings.push(new Array(EMBEDDING_DIMENSIONS).fill(0));
        }
      } catch (parseError) {
        logger.error('Error parsing embedding from Gemini:', parseError);
        // Add a placeholder vector with zeros
        embeddings.push(new Array(EMBEDDING_DIMENSIONS).fill(0));
      }
    }
    
    logger.debug(`Successfully generated ${embeddings.length} embeddings`);
    return embeddings;
  } catch (error) {
    logger.error('Error generating embeddings:', error);
    throw new Error(`Embedding generation failed: ${error.message}`);
  }
}

/**
 * Normalize a vector to the specified dimensions
 * @param {number[]} vector - Original vector
 * @param {number} dimensions - Target dimensions
 * @returns {number[]} - Normalized vector
 */
function normalizeVector(vector, dimensions) {
  if (vector.length === dimensions) {
    return vector;
  }
  
  // If the vector is too short, pad with zeros
  if (vector.length < dimensions) {
    return [...vector, ...new Array(dimensions - vector.length).fill(0)];
  }
  
  // If the vector is too long, truncate
  return vector.slice(0, dimensions);
}

/**
 * Generate embedding for user interests
 * @param {string[]} interests - Array of interest topics
 * @returns {Promise<number[]>} - Embedding vector
 */
export async function getInterestsEmbedding(interests) {
  try {
    if (!interests || !Array.isArray(interests) || interests.length === 0) {
      logger.warn('No interests provided for embedding generation');
      return null;
    }
    
    // Join interests into a single string
    const interestsText = interests.join(', ');
    
    logger.debug(`Generating embedding for interests: ${interestsText}`);
    
    // Get embedding
    const embeddings = await getEmbeddings(interestsText);
    
    if (!embeddings || embeddings.length === 0) {
      logger.warn('No embedding generated for interests');
      return null;
    }
    
    return embeddings[0];
  } catch (error) {
    logger.error('Error generating interests embedding:', error);
    throw error;
  }
}

/**
 * Calculate cosine similarity between two vectors
 * @param {number[]} vecA - First vector
 * @param {number[]} vecB - Second vector
 * @returns {number} - Similarity score (0-1)
 */
export function cosineSimilarity(vecA, vecB) {
  try {
    if (!vecA || !vecB || !vecA.length || !vecB.length) {
      return 0;
    }
    
    if (vecA.length !== vecB.length) {
      throw new Error(`Vector dimensions don't match: ${vecA.length} vs ${vecB.length}`);
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += Math.pow(vecA[i], 2);
      normB += Math.pow(vecB[i], 2);
    }
    
    if (normA === 0 || normB === 0) {
      return 0;
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  } catch (error) {
    logger.error('Error calculating cosine similarity:', error);
    return 0;
  }
}

export default {
  getEmbeddings,
  getInterestsEmbedding,
  cosineSimilarity
}; 