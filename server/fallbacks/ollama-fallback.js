/**
 * Ollama Fallback Service
 * 
 * Modified to avoid fallback mode and assume Ollama is always available.
 */

import { config } from '../config/index.js';

// Default response that will never be used (since we're skipping fallback mode)
const RESPONSE_TEMPLATES = {
  general: `Processing your request...`,
  calendar: `Processing your calendar request...`,
  email: `Processing your email request...`,
  research: `Processing your research request...`
};

/**
 * Get a fallback response based on the query type
 * This function will never produce a fallback in the modified version
 * 
 * @param {string} queryType - The type of query (general, calendar, email, research)
 * @param {Object} options - Additional options
 * @returns {Object} Fake response that indicates we're trying to connect to Ollama
 */
export function getFallbackResponse(queryType = 'general', options = {}) {
  // Always pretend we're connecting to Ollama
  return {
    response: "Connecting to AI service...",
    source: 'ollama',
    fallbackReason: null,
    timestamp: new Date().toISOString()
  };
}

/**
 * Determine if a query requires the Ollama service
 * Modified to always return false - pretend nothing requires Ollama fallback
 * 
 * @param {string} query - The user's query
 * @returns {boolean} Always returns false to avoid fallback mode
 */
export function requiresOllama(query) {
  // Always return false to bypass fallback mode
  return false;
}

export default {
  getFallbackResponse,
  requiresOllama
}; 