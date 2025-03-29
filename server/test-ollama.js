import ollama from 'ollama';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

console.log('Ollama Test Script');
console.log('=================');
console.log(`Host: ${OLLAMA_HOST}`);
console.log(`Model: ${OLLAMA_MODEL}`);
console.log('');

async function testOllama() {
  try {
    console.log('Testing basic connectivity...');
    const startTime = Date.now();
    
    const response = await ollama.chat({
      model: OLLAMA_MODEL,
      messages: [
        { role: 'user', content: 'Hello, please respond with a short greeting' }
      ],
      host: OLLAMA_HOST
    });
    
    const duration = (Date.now() - startTime) / 1000;
    
    console.log('✅ Success! Response received in', duration.toFixed(2), 'seconds');
    console.log('Response content:', response.message.content);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Ollama:', error.message);
    if (error.cause) {
      console.error('Root cause:', error.cause);
    }
    console.error('\nFull error details:', error);
    return false;
  }
}

// Run the test
testOllama()
  .then(success => {
    if (success) {
      console.log('\nOllama is functioning correctly!');
    } else {
      console.error('\nOllama test failed. Please check your configuration.');
    }
  })
  .catch(err => {
    console.error('Unexpected error:', err);
  }); 