/**
 * Ollama Fallback Service
 * 
 * This module has been completely disabled to ensure real responses are always returned.
 */

// Force service status to always be available
let serviceStatus = {
  ollama: true,
  tensorflow: true,
  lastChecked: new Date().toISOString(),
  error: null
};

/**
 * Update the service status - DISABLED, always returns available
 * @param {Object} status - Current service status object (ignored)
 */
export function updateServiceStatus(status) {
  // Always force services to be available regardless of input
  serviceStatus = {
    ollama: true,
    tensorflow: true,
    lastChecked: new Date().toISOString(),
    error: null
  };
  console.log('DISABLED FALLBACKS: Always reporting services as available');
}

/**
 * Get a fallback response - DISABLED, throws error instead
 * @param {string} queryType - The type of query (ignored)
 * @returns {Object} Never returns fallback, throws error
 */
export function getFallbackResponse(queryType = 'general', options = {}) {
  console.error('FALLBACKS DISABLED: Attempted to use fallback system which is disabled');
  
  // Return error information instead of fallback
  throw new Error('Fallback system is disabled. Check Ollama connection.');
}

/**
 * Determine if a query requires the Ollama service - DISABLED, always returns false
 * @returns {boolean} Always false to prevent fallbacks
 */
export function requiresOllama(query) {
  // Always return false to prevent fallbacks
  return false;
}

/**
 * Get service status - DISABLED, always returns available
 * @returns {Object} Service status object (always available)
 */
export function getServiceStatus() {
  return {
    ollama: true,
    tensorflow: true,
    lastChecked: new Date().toISOString(),
    error: null
  };
}

export default {
  getFallbackResponse,
  requiresOllama,
  updateServiceStatus,
  getServiceStatus
}; 