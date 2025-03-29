/**
 * Test script for Direct Chat functionality
 * Run with: node test-direct-chat.js
 */

// Simulate browser environment for localStorage
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};

// Import the sendMessage function
const fetch = require('node-fetch');

/**
 * Test the Ollama connection directly without authentication
 * @returns {Promise<Object>} - The response from the test endpoint
 */
async function testOllamaConnection() {
  console.log('Testing Ollama connection via direct endpoint...');
  
  try {
    const response = await fetch('http://localhost:5002/test-ollama', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error response:', errorData);
      return {
        error: errorData.error || 'Request failed with status ' + response.status,
        status: response.status
      };
    }
    
    const data = await response.json();
    console.log('Response data:', data);
    
    return data;
  } catch (error) {
    console.error('Error testing Ollama connection:', error);
    return { error: error.message };
  }
}

/**
 * Test the health endpoint to verify server is running
 */
async function testHealthEndpoint() {
  console.log('Testing server health endpoint...');
  
  try {
    const response = await fetch('http://localhost:5002/health', {
      method: 'GET'
    });
    
    if (!response.ok) {
      console.error('Health check failed with status:', response.status);
      return false;
    }
    
    const data = await response.json();
    console.log('Health check response:', data);
    return true;
  } catch (error) {
    console.error('Error testing health endpoint:', error);
    return false;
  }
}

/**
 * Test the services health endpoint
 */
async function testServicesEndpoint() {
  console.log('Testing services health endpoint...');
  
  try {
    const response = await fetch('http://localhost:5002/api/health/services', {
      method: 'GET'
    });
    
    if (!response.ok) {
      console.error('Services check failed with status:', response.status);
      return false;
    }
    
    const data = await response.json();
    console.log('Services health response:', data);
    return data;
  } catch (error) {
    console.error('Error testing services endpoint:', error);
    return { error: error.message };
  }
}

// Run all tests
async function runTests() {
  try {
    console.log('Running all tests...');
    
    // Test 1: Server health
    const healthResult = await testHealthEndpoint();
    if (!healthResult) {
      console.error('Server health check failed - server may not be running');
      return;
    }
    
    // Test 2: Services status
    const servicesResult = await testServicesEndpoint();
    if (servicesResult.error) {
      console.error('Services check failed:', servicesResult.error);
    } else {
      console.log('Ollama service status:', servicesResult.services.ollama ? 'Available' : 'Unavailable');
    }
    
    // Test 3: Direct Ollama test
    const ollamaResult = await testOllamaConnection();
    
    console.log('\n==== TEST RESULTS ====');
    console.log('Server Health:', healthResult ? 'OK' : 'Failed');
    console.log('Services Health:', servicesResult.error ? 'Failed' : 'OK');
    console.log('Ollama Connection:', ollamaResult.error ? 'Failed' : 'Success');
    
    if (ollamaResult.error) {
      console.log('Ollama Error:', ollamaResult.error);
    } else if (ollamaResult.response) {
      console.log('Ollama Response:', ollamaResult.response);
    }
    
    // Tests complete
    console.log('All tests completed!');
  } catch (error) {
    console.error('Tests failed with error:', error);
  }
}

// Run the tests
runTests(); 