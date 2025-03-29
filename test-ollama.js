// Test Ollama connectivity directly

import ollama from 'ollama';

console.log('Testing direct connection to Ollama...');

async function testOllama() {
  try {
    const host = process.env.OLLAMA_HOST || 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL || 'llama3.2';
    
    console.log(`Using host: ${host}`);
    console.log(`Using model: ${model}`);
    
    const response = await ollama.chat({
      model: model,
      messages: [
        { role: 'user', content: 'Hello, please respond with a short greeting.' }
      ],
      host: host
    });
    
    console.log('Success! Ollama responded:');
    console.log(response.message.content);
    return true;
  } catch (error) {
    console.error('Error connecting to Ollama:');
    console.error(error);
    return false;
  }
}

// Run the test
testOllama().then(success => {
  if (success) {
    console.log('Ollama test completed successfully!');
  } else {
    console.log('Ollama test failed.');
  }
}); 