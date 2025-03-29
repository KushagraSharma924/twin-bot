/**
 * Ollama Fallback Service
 * 
 * Provides responses when the Ollama service is unavailable.
 * This ensures the application can continue functioning even when
 * the Ollama LLM service cannot be reached.
 */

import { config } from '../config/index.js';

// Default response templates for different query types
const RESPONSE_TEMPLATES = {
  general: `I apologize, but I'm currently running in fallback mode because our AI service is temporarily unavailable. 
  
Basic functionality is still available, but advanced AI capabilities are limited. Our team has been notified about this issue and is working to restore full service.

In the meantime, I can still help you with:
- Managing your schedule
- Organizing your tasks
- Accessing your saved information`,

  calendar: `I apologize, but I can't process calendar operations with AI assistance right now because our AI service is temporarily unavailable. 
  
However, you can still create and manage calendar events through the standard interface. Try using specific commands or the calendar UI to continue.`,

  email: `I apologize, but I can't analyze emails right now because our AI service is temporarily unavailable.
  
You can still access and manage your emails through the standard interface. Basic functionality like viewing and organizing emails is still available.`,

  research: `I apologize, but advanced research capabilities are currently unavailable because our AI service is temporarily offline.
  
Basic search functionality is still available, and you can access your previously saved research. Try using specific search terms or browsing your saved documents.`
};

/**
 * Get a fallback response based on the query type
 * 
 * @param {string} queryType - The type of query (general, calendar, email, research)
 * @param {Object} options - Additional options
 * @returns {Object} Fallback response
 */
export function getFallbackResponse(queryType = 'general', options = {}) {
  const responseTemplate = RESPONSE_TEMPLATES[queryType] || RESPONSE_TEMPLATES.general;
  
  // Add service status information if available
  let statusInfo = '';
  if (config.serviceStatus && typeof config.serviceStatus === 'object') {
    const { ollama, tensorflow } = config.serviceStatus;
    statusInfo = `\n\nService Status:
- Ollama: ${ollama ? 'Available' : 'Unavailable'}
- TensorFlow: ${tensorflow ? 'Available' : 'Unavailable'}`;
  }
  
  // Create the response object
  return {
    response: responseTemplate + statusInfo,
    source: 'fallback',
    fallbackReason: options.error || 'Ollama service unavailable',
    timestamp: new Date().toISOString()
  };
}

/**
 * Determine if a query requires the Ollama service
 * Simple heuristic to check if we can bypass the AI service
 * 
 * @param {string} query - The user's query
 * @returns {boolean} True if the query requires Ollama
 */
export function requiresOllama(query) {
  // Queries that don't strictly need Ollama
  const basicOperations = [
    // Calendar simple operations
    /^(show|list|get|display) (my |)calendar/i,
    /^(show|list|get|display) (my |)events/i,
    
    // Email simple operations
    /^(show|list|get|display) (my |)emails/i,
    /^(show|list|get|display) (my |)inbox/i,
    
    // System status
    /^(system |service |)status/i,
    /^(check |get |)health/i
  ];
  
  // Check if the query matches any of the basic operations
  for (const pattern of basicOperations) {
    if (pattern.test(query)) {
      return false;
    }
  }
  
  // By default, assume the query requires Ollama
  return true;
}

export default {
  getFallbackResponse,
  requiresOllama
}; 