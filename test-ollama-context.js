/**
 * Simple test script for Ollama context retention
 */

import ollama from 'ollama';
import readline from 'readline';

// Configure Ollama
const ollamaHost = 'https://chatbot-x8x4.onrender.com';
const ollamaModel = 'llama3.2';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to test context retention
async function testContextRetention() {
  console.log(`\n===== Ollama Context Retention Test =====`);
  console.log(`Model: ${ollamaModel}`);
  console.log(`Host: ${ollamaHost}`);
  console.log(`===================================\n`);
  
  // Maintain conversation history
  const messages = [
    { 
      role: 'system', 
      content: 'You are a helpful AI assistant that maintains context across multiple interactions. Be concise in your responses.' 
    }
  ];
  
  console.log('Starting conversation with context retention...\n');
  console.log('Type your messages and see if the model retains context from previous turns.');
  console.log('Type "exit" to end the conversation.\n');
  
  let turn = 1;
  let chatActive = true;
  
  while (chatActive) {
    const userMessage = await new Promise(resolve => {
      rl.question(`[Turn ${turn}] You: `, (answer) => resolve(answer));
    });
    
    if (userMessage.toLowerCase() === 'exit') {
      chatActive = false;
      continue;
    }
    
    // Add user message to conversation history
    messages.push({ role: 'user', content: userMessage });
    
    try {
      console.log(`Sending message to Ollama with ${messages.length} messages in context...`);
      
      // Make API call to Ollama with context
      const response = await ollama.chat({
        model: ollamaModel,
        messages: messages,
        host: ollamaHost
      });
      
      const assistantMessage = response.message.content;
      
      // Display the response
      console.log(`[Turn ${turn}] Assistant: ${assistantMessage}\n`);
      
      // Add assistant response to conversation history
      messages.push({ role: 'assistant', content: assistantMessage });
      
      turn++;
    } catch (error) {
      console.error('Error communicating with Ollama:', error.message);
    }
  }
  
  console.log('\nConversation summary:');
  console.log(`- Total turns: ${turn - 1}`);
  console.log(`- Messages in context: ${messages.length}`);
  console.log('- Context retention: ' + (messages.length > 3 ? 'Successful' : 'Not tested enough'));
  
  rl.close();
}

// Run the test
testContextRetention().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
}); 