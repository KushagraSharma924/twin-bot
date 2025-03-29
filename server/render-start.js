/**
 * Render Startup Script
 * 
 * This script helps configure the server for deployment on Render.
 * It loads the correct environment variables and validates configurations.
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Render-specific environment variables
dotenv.config({ path: path.join(__dirname, '.env.render') });

console.log('🚀 Starting server in Render environment');
console.log(`📌 NODE_ENV: ${process.env.NODE_ENV}`);

// Check if Ollama is already running, if not setup
const OLLAMA_DIR = path.join(__dirname, '..', 'ollama');
if (!fs.existsSync(OLLAMA_DIR) || !fs.existsSync(path.join(OLLAMA_DIR, 'ollama'))) {
  console.log('🔄 Ollama not found. Setting up Ollama and Nginx...');
  try {
    // Run the setup script
    import('./ollama-render-setup.js')
      .then(() => console.log('✅ Ollama setup complete'))
      .catch(err => console.error('❌ Error setting up Ollama:', err));
  } catch (error) {
    console.error('❌ Failed to import Ollama setup script:', error);
  }
}

// Check and set appropriate Ollama configuration
const ollamaHost = process.env.OLLAMA_HOST;
if (!ollamaHost) {
  console.warn('⚠️ Warning: OLLAMA_HOST not set in .env.render');
  console.warn('   The application will fall back to alternative AI providers or static responses.');
} else {
  console.log(`📌 OLLAMA_HOST: ${ollamaHost}`);
  
  // Verify the URL format is correct
  try {
    const url = new URL(ollamaHost);
    console.log(`   Protocol: ${url.protocol}`);
    console.log(`   Hostname: ${url.hostname}`);
    console.log(`   Path: ${url.pathname}`);
    
    // Check if the URL ends with /ollama
    if (!url.pathname.endsWith('/ollama')) {
      console.warn('⚠️ Warning: OLLAMA_HOST should end with /ollama for proper Nginx proxy configuration');
    }
    
    // Check if we're using port 8081 for Nginx
    if (url.port === '8081' || url.hostname === 'localhost') {
      console.log('✅ Using local Nginx on port 8081 for Ollama proxy');
      
      // Check if Nginx is running on port 8081
      try {
        console.log('Checking if Nginx is running on port 8081...');
        execSync('curl -s -I http://localhost:8081/');
        console.log('✅ Nginx is running on port 8081');
      } catch (error) {
        console.warn('⚠️ Nginx does not appear to be running on port 8081');
        console.warn('   Fallback AI providers will be used if Ollama is not accessible');
      }
    }
  } catch (e) {
    console.error('❌ Error: OLLAMA_HOST is not a valid URL:', e.message);
    console.error('   Please fix this in your .env.render file or Render environment variables.');
  }
}

// Set RENDER flag to true for conditional logic in the application
process.env.RENDER = 'true';

// Check for fallback providers
const hasOpenAIFallback = !!process.env.OPENAI_API_KEY;
const hasGeminiFallback = !!process.env.GEMINI_API_KEY;
console.log(`📌 OpenAI fallback available: ${hasOpenAIFallback ? 'Yes' : 'No'}`);
console.log(`📌 Gemini fallback available: ${hasGeminiFallback ? 'Yes' : 'No'}`);

if (!hasOpenAIFallback && !hasGeminiFallback) {
  console.warn('⚠️ Warning: No fallback AI providers configured. The application will use static responses if Ollama is unavailable.');
}

// Set connection timeouts
process.env.OLLAMA_CONNECT_TIMEOUT = process.env.OLLAMA_CONNECT_TIMEOUT || '10000';
console.log(`📌 Ollama Connect Timeout: ${process.env.OLLAMA_CONNECT_TIMEOUT}ms`);

// Test the Ollama connection
console.log('🔍 Testing Ollama connection...');
fetch(`${ollamaHost}/api/version`, { 
  timeout: parseInt(process.env.OLLAMA_CONNECT_TIMEOUT),
  headers: { 'Content-Type': 'application/json' }
})
  .then(response => {
    if (response.ok) {
      console.log('✅ Ollama is accessible through the Nginx proxy!');
      return response.json();
    } else {
      throw new Error(`Status code: ${response.status}`);
    }
  })
  .then(data => {
    if (data && data.version) {
      console.log(`   Ollama version: ${data.version}`);
    } else {
      console.log('   Ollama version information not available');
    }
  })
  .catch(error => {
    console.warn(`⚠️ Ollama connection test failed: ${error.message}`);
    console.warn('   The application will use fallback providers or static responses.');
    
    // Try to check if Ollama is running directly
    try {
      console.log('Checking if Ollama is running directly on port 11434...');
      fetch('http://localhost:11434/api/version', { 
        timeout: parseInt(process.env.OLLAMA_CONNECT_TIMEOUT) 
      })
        .then(response => {
          if (response.ok) {
            console.log('✅ Ollama is running directly on port 11434');
            console.log('   This suggests a proxy configuration issue');
          } else {
            console.warn('⚠️ Ollama is not accessible directly either');
          }
        })
        .catch(err => {
          console.warn('⚠️ Ollama is not accessible directly:', err.message);
        });
    } catch (error) {
      console.warn('⚠️ Failed to check direct Ollama access:', error.message);
    }
  });

// Proceed with importing the server
console.log('📦 Loading main server application...');
import('./server.js').catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
}); 