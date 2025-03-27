/**
 * Simple logger utility for server operations
 */

const logger = {
  info: (message, data = {}) => {
    console.log(`[INFO] ${message}`, data);
  },
  
  error: (message, data = {}) => {
    console.error(`[ERROR] ${message}`, data);
  },
  
  warn: (message, data = {}) => {
    console.warn(`[WARNING] ${message}`, data);
  },
  
  debug: (message, data = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] ${message}`, data);
    }
  }
};

export default logger; 