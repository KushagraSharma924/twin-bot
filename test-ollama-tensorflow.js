/**
 * Test script for Ollama TensorFlow learning capabilities
 * 
 * This script demonstrates how Ollama can learn from user interactions
 * using TensorFlow to personalize responses over time.
 */

import readline from 'readline';
import ollamaTensorflowService from './server/services/ollamaTensorflowService.js';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Sample user ID for testing
const TEST_USER_ID = 'test-user-123';

// Sample feedback options
const FEEDBACK_OPTIONS = [
  { name: 'Poor', value: 0.0 },
  { name: 'Fair', value: 0.25 },
  { name: 'Good', value: 0.5 },
  { name: 'Very Good', value: 0.75 },
  { name: 'Excellent', value: 1.0 }
];

// Stored interactions for batch training
const storedInteractions = [];

/**
 * Test the Ollama TensorFlow learning capabilities
 */
async function testOllamaTensorflowLearning() {
  console.log('\n===== Ollama TensorFlow Learning Test =====');
  console.log('This test demonstrates how Ollama can learn from your feedback.');
  console.log('1. Enter a message to get a response');
  console.log('2. Provide feedback on the response');
  console.log('3. Over time, the system will learn your preferences');
  console.log('Type "batch" to run batch training with stored interactions');
  console.log('Type "exit" to end the test');
  console.log('===========================================\n');
  
  let isRunning = true;
  let turnCount = 1;
  
  // Get or create a learner for the test user
  const learner = await ollamaTensorflowService.getLearnerForUser(TEST_USER_ID);
  console.log(`Initialized learning model for user ${TEST_USER_ID}`);
  
  while (isRunning) {
    // Get user message
    const userMessage = await askQuestion(`\n[Turn ${turnCount}] You: `);
    
    if (userMessage.toLowerCase() === 'exit') {
      isRunning = false;
      continue;
    }
    
    if (userMessage.toLowerCase() === 'batch') {
      await runBatchTraining();
      continue;
    }
    
    try {
      console.log('Getting enhanced response...');
      
      // Get enhanced response
      const enhancedResponse = await ollamaTensorflowService.getEnhancedResponse(
        TEST_USER_ID,
        userMessage
      );
      
      const responseContent = enhancedResponse.content || enhancedResponse;
      console.log(`\n[Turn ${turnCount}] Assistant: ${responseContent}`);
      
      if (enhancedResponse.relevanceScore !== undefined) {
        console.log(`Relevance Score: ${enhancedResponse.relevanceScore.toFixed(4)}`);
      }
      
      // Ask for feedback
      const feedbackIndex = await askForFeedback();
      const feedbackValue = FEEDBACK_OPTIONS[feedbackIndex].value;
      
      // Create an interaction
      const interaction = {
        message: userMessage,
        response: responseContent,
        positive_feedback: feedbackValue,
        timestamp: Date.now()
      };
      
      // Store the interaction for batch training later
      storedInteractions.push(interaction);
      
      // Train the model with this feedback
      console.log(`Training model with feedback: ${feedbackValue}`);
      const result = await ollamaTensorflowService.trainWithFeedback(
        TEST_USER_ID,
        [interaction]
      );
      
      console.log('Training result:', result.message);
      
      turnCount++;
    } catch (error) {
      console.error('Error during testing:', error);
    }
  }
  
  console.log('\nTest completed!');
  console.log(`Total interactions: ${turnCount - 1}`);
  console.log(`Stored interactions for batch training: ${storedInteractions.length}`);
  
  rl.close();
}

/**
 * Ask a question and get user input
 */
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Ask for feedback on the response
 */
async function askForFeedback() {
  console.log('\nHow would you rate this response?');
  FEEDBACK_OPTIONS.forEach((option, index) => {
    console.log(`${index + 1}. ${option.name}`);
  });
  
  while (true) {
    const feedback = await askQuestion('Enter your feedback (1-5): ');
    const feedbackIndex = parseInt(feedback) - 1;
    
    if (feedbackIndex >= 0 && feedbackIndex < FEEDBACK_OPTIONS.length) {
      return feedbackIndex;
    }
    
    console.log('Invalid feedback. Please enter a number between 1 and 5.');
  }
}

/**
 * Run batch training with stored interactions
 */
async function runBatchTraining() {
  if (storedInteractions.length === 0) {
    console.log('No stored interactions for batch training.');
    return;
  }
  
  console.log(`Running batch training with ${storedInteractions.length} interactions...`);
  
  try {
    const result = await ollamaTensorflowService.trainWithFeedback(
      TEST_USER_ID,
      storedInteractions
    );
    
    console.log('Batch training result:', result.message);
  } catch (error) {
    console.error('Error during batch training:', error);
  }
}

// Run the test
testOllamaTensorflowLearning().catch((error) => {
  console.error('Test failed:', error);
  rl.close();
  process.exit(1);
}); 