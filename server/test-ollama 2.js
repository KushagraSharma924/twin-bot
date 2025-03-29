import dotenv from 'dotenv';
import * as aiService from './services/aiService.js';

// Load environment variables
dotenv.config();

async function testOllama() {
  try {
    console.log('Testing Ollama LLM integration...');
    
    // Test basic prompt
    console.log('\n[TEST] Basic prompt');
    const result = await aiService.processNLPTask('What is machine learning in 2 sentences?');
    console.log('Response:', result);
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Error testing Ollama:', error);
  }
}

// Run the tests
testOllama(); 