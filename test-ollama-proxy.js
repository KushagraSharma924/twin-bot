/**
 * Test script to verify Ollama connectivity through Nginx reverse proxy
 */

import ollama from 'ollama';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function testOllamaProxy() {
  // Get configuration from .env.local
  const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:8081/ollama';
  const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2';
  
  console.log('\n===== Ollama Nginx Proxy Test =====');
  console.log(`Host: ${ollamaHost}`);
  console.log(`Model: ${ollamaModel}`);
  console.log('===================================\n');
  
  try {
    // Test 1: Check available models
    console.log('Test 1: Checking available models...');
    const models = await ollama.list({ host: ollamaHost });
    console.log(`Available models: ${models.models.map(m => m.name).join(', ')}`);
    console.log('Model list test successful ✅\n');
    
    // Test 2: Simple generation
    console.log('Test 2: Testing simple text generation...');
    const response = await ollama.chat({
      model: ollamaModel,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say hello and tell me the current time in one brief sentence.' }
      ],
      host: ollamaHost
    });
    
    console.log(`Response: ${response.message.content}`);
    console.log('Generation test successful ✅\n');
    
    // Test 3: Get embeddings
    console.log('Test 3: Testing embeddings API...');
    const embeddingResponse = await ollama.embeddings({
      model: ollamaModel,
      prompt: 'This is a test of the embeddings API.',
      host: ollamaHost
    });
    
    console.log(`Embedding vector length: ${embeddingResponse.embedding.length}`);
    console.log('Embeddings test successful ✅\n');
    
    console.log('All tests completed successfully! Ollama is accessible through Nginx reverse proxy.');
  } catch (error) {
    console.error('Error testing Ollama through Nginx proxy:', error);
    console.error('\nPlease check:');
    console.error('1. Is Ollama running? (ollama serve)');
    console.error('2. Is Nginx running? (brew services info nginx)');
    console.error('3. Is the proxy configuration correct?');
    console.error('4. Is the OLLAMA_HOST in .env.local pointing to the correct URL?');
    process.exit(1);
  }
}

// Run tests
testOllamaProxy().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
}); 