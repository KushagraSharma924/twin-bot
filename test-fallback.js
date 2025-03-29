// Script to help identify where fallback messages are coming from

import ollama from 'ollama';
import fs from 'fs';
import path from 'path';

const fallbackMessage = `I apologize, but I'm currently running in fallback mode because our AI service is temporarily unavailable. 
  
Basic functionality is still available, but advanced AI capabilities are limited. Our team has been notified about this issue and is working to restore full service.

In the meantime, I can still help you with:
- Managing your schedule
- Organizing your tasks
- Accessing your saved information

Service Status:
- Ollama: Unavailable
- TensorFlow: Unavailable`;

// Search for the fallback message in JS/TS files
async function searchForFallbackMessage() {
  const baseDir = process.cwd();
  let foundLocations = [];
  
  // Search recursively through directories
  const searchDir = async (dir) => {
    const files = await fs.promises.readdir(dir, { withFileTypes: true });
    
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      
      if (file.isDirectory() && !fullPath.includes('node_modules') && !fullPath.includes('.git')) {
        await searchDir(fullPath);
      } else if (file.isFile() && /\.(js|ts|tsx|jsx)$/.test(file.name)) {
        try {
          const content = await fs.promises.readFile(fullPath, 'utf8');
          
          // Look for parts of the fallback message
          if (content.includes('fallback mode') || 
              content.includes('temporarily unavailable') ||
              content.includes('Service Status:') ||
              content.includes('Ollama: Unavailable')) {
                
            console.log(`Found potential match in: ${fullPath}`);
            
            // Find line numbers
            const lines = content.split('\n');
            let lineNumbers = [];
            
            lines.forEach((line, index) => {
              if (line.includes('fallback mode') || 
                  line.includes('temporarily unavailable') ||
                  line.includes('Service Status:') ||
                  line.includes('Ollama: Unavailable')) {
                lineNumbers.push(index + 1);
              }
            });
            
            foundLocations.push({
              file: fullPath,
              lineNumbers
            });
            
            console.log(`  Lines: ${lineNumbers.join(', ')}`);
          }
        } catch (err) {
          console.error(`Error reading ${fullPath}:`, err);
        }
      }
    }
  };
  
  console.log('Searching for fallback message...');
  await searchDir(baseDir);
  
  if (foundLocations.length === 0) {
    console.log('No direct matches found for the fallback message.');
  } else {
    console.log('\nPotential locations found:');
    foundLocations.forEach(location => {
      console.log(`- ${location.file} (lines: ${location.lineNumbers.join(', ')})`);
    });
  }
}

// Check Ollama connectivity
async function testOllama() {
  try {
    const host = process.env.OLLAMA_HOST || 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL || 'llama3.2';
    
    console.log(`Testing Ollama connection at ${host} with model ${model}...`);
    
    const response = await ollama.chat({
      model: model,
      messages: [
        { role: 'user', content: 'Hello, give a very brief response.' }
      ],
      host: host
    });
    
    console.log('Ollama response:');
    console.log(response.message.content);
    return true;
  } catch (error) {
    console.error('Error connecting to Ollama:');
    console.error(error);
    return false;
  }
}

async function main() {
  console.log('Testing for fallback message sources...\n');
  
  // Test Ollama connectivity
  const ollamaWorking = await testOllama();
  console.log(`\nOllama connectivity: ${ollamaWorking ? 'SUCCESS' : 'FAILED'}\n`);
  
  // Search for fallback message
  await searchForFallbackMessage();
}

main().catch(error => {
  console.error('Error in test script:', error);
}); 