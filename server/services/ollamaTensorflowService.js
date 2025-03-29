/**
 * Ollama TensorFlow Learning Service
 *
 * This service extends Ollama's capabilities by adding TensorFlow-based learning
 * to enable the chatbot to learn from user interactions over time.
 */

import * as tf from '@tensorflow/tfjs-node';
import ollama from 'ollama';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'https://chatbot-x8x4.onrender.com';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
const EMBEDDING_DIM = parseInt(process.env.EMBEDDING_DIM || '384'); // Default embedding dimension
const LEARNING_RATE = parseFloat(process.env.LEARNING_RATE || '0.001');
const MODELS_DIR = process.env.MODELS_DIR || './models/ollama-tf';
const USER_EMBEDDINGS_FILE = 'user_embeddings.json';
const ENABLE_TENSORFLOW_LEARNING = process.env.ENABLE_TENSORFLOW_LEARNING === 'true';
const OLLAMA_CONNECT_TIMEOUT = parseInt(process.env.OLLAMA_CONNECT_TIMEOUT || '5000'); // 5 second timeout by default

// Track service initialization status
let isServiceInitialized = false;
let initializationError = null;

// Create models directory if it doesn't exist
async function ensureModelsDirectory() {
  try {
    await fs.mkdir(MODELS_DIR, { recursive: true });
    console.log(`Models directory created at ${MODELS_DIR}`);
    return true;
  } catch (error) {
    console.error('Error creating models directory:', error);
    initializationError = error;
    return false;
  }
}

// Initialize the service
async function initializeService() {
  if (isServiceInitialized) return true;
  
  if (!ENABLE_TENSORFLOW_LEARNING) {
    console.log('TensorFlow learning is disabled by configuration');
    isServiceInitialized = true;
    return true;
  }
  
  try {
    // Verify TensorFlow is working
    const tfVersion = tf.version.tfjs;
    console.log(`TensorFlow.js version: ${tfVersion}`);
    
    // Verify Ollama is accessible
    try {
      console.log(`Checking Ollama service at ${OLLAMA_HOST}...`);

      // Set up a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Connection to Ollama timed out after ${OLLAMA_CONNECT_TIMEOUT}ms`)), OLLAMA_CONNECT_TIMEOUT);
      });
      
      // Try to connect to Ollama with timeout
      const ollamaPromise = ollama.list({ host: OLLAMA_HOST });
      const ollamaCheck = await Promise.race([ollamaPromise, timeoutPromise]);
      
      console.log('Ollama service is accessible');
    } catch (ollamaError) {
      console.warn(`Warning: Could not connect to Ollama service at ${OLLAMA_HOST}. Some features may not work.`);
      console.warn('Error details:', ollamaError.message);
      
      // Record the error but continue initialization
      initializationError = new Error(`Ollama service unavailable: ${ollamaError.message}`);
    }
    
    // Ensure models directory exists
    await ensureModelsDirectory();
    
    isServiceInitialized = true;
    console.log('TensorFlow learning service initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize TensorFlow learning service:', error);
    initializationError = error;
    return false;
  }
}

// Initialize the service on module load
initializeService().catch(error => {
  console.error('Error during automatic service initialization:', error);
});

// Initialize TensorFlow model for learning user preferences
class OllamaTensorflowLearner {
  constructor(userId) {
    this.userId = userId;
    this.model = null;
    this.embeddings = {};
    this.initialized = false;
    this.optimizer = tf.train.adam(LEARNING_RATE);
    this.initializationError = null;
  }

  /**
   * Initialize the TensorFlow model
   */
  async initialize() {
    if (this.initialized) return true;
    
    if (!isServiceInitialized) {
      await initializeService();
    }
    
    if (!ENABLE_TENSORFLOW_LEARNING) {
      console.log(`TensorFlow learning disabled for user ${this.userId}`);
      this.initialized = true;
      return true;
    }
    
    try {
      await ensureModelsDirectory();
      
      try {
        // Try to load existing model
        this.model = await this.loadModel();
        console.log(`Loaded existing model for user ${this.userId}`);
      } catch (loadError) {
        // Create a new model if loading fails
        console.log(`Creating new model for user ${this.userId}`);
        this.model = this.createModel();
      }
      
      // Load user embeddings if they exist
      await this.loadUserEmbeddings();
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error(`Error initializing learner for user ${this.userId}:`, error);
      this.initializationError = error;
      return false;
    }
  }

  /**
   * Create a new TensorFlow model for personalization
   */
  createModel() {
    try {
      const model = tf.sequential();
      
      // Input layer with the embedding dimension
      model.add(tf.layers.dense({
        units: 128,
        activation: 'relu',
        inputShape: [EMBEDDING_DIM]
      }));
      
      // Hidden layer
      model.add(tf.layers.dense({
        units: 64,
        activation: 'relu'
      }));
      
      // Output layer - will predict relevance score
      model.add(tf.layers.dense({
        units: 1,
        activation: 'sigmoid'
      }));
      
      // Compile the model
      model.compile({
        optimizer: this.optimizer,
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
      });
      
      return model;
    } catch (error) {
      console.error('Error creating TensorFlow model:', error);
      throw error;
    }
  }

  /**
   * Get embeddings for a text using Ollama
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>} - Embedding vector
   */
  async getEmbedding(text) {
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Embedding request timed out after ${OLLAMA_CONNECT_TIMEOUT}ms`)), OLLAMA_CONNECT_TIMEOUT);
      });
      
      const embeddingPromise = ollama.embeddings({
        model: OLLAMA_MODEL,
        prompt: text,
        host: OLLAMA_HOST
      });
      
      // Race the embedding request against the timeout
      const response = await Promise.race([embeddingPromise, timeoutPromise]);
      
      return response.embedding;
    } catch (error) {
      console.error('Error getting embedding from Ollama:', error);
      
      // Generate a deterministic fallback embedding based on the text hash
      // This will return the same embedding for the same text, providing some consistency
      const fallbackEmbedding = this.generateDeterministicEmbedding(text);
      console.warn('Using fallback deterministic embedding due to Ollama error');
      
      return fallbackEmbedding;
    }
  }
  
  /**
   * Generate a deterministic embedding from text using a simple hash function
   * @param {string} text - Input text
   * @returns {number[]} - Pseudo-embedding vector
   */
  generateDeterministicEmbedding(text) {
    // Simple hash function to generate a number from a string
    const hashCode = (str) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return hash;
    };
    
    // Generate a seed from the text
    const seed = hashCode(text);
    
    // Generate a deterministic array of numbers based on the seed
    const embedding = [];
    let value = seed;
    
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      // Generate next value in sequence using a simple LCG
      value = (1664525 * value + 1013904223) % 4294967296;
      // Scale to range [-0.1, 0.1]
      embedding.push((value / 4294967296) * 0.2 - 0.1);
    }
    
    // Normalize the vector to have unit length
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }

  /**
   * Train the model on a set of user interactions
   * @param {Array<Object>} interactions - User message and response pairs with feedback
   * @returns {Promise<Object>} - Training history
   */
  async train(interactions) {
    if (!await this.initialize()) {
      return { 
        success: false, 
        message: 'Failed to initialize learner',
        error: this.initializationError?.message
      };
    }
    
    if (!ENABLE_TENSORFLOW_LEARNING) {
      return { 
        success: false, 
        message: 'TensorFlow learning is disabled by configuration'
      };
    }
    
    if (interactions.length === 0) {
      return { success: false, message: 'No interactions to train on' };
    }
    
    // Prepare training data
    const trainingData = [];
    
    for (const interaction of interactions) {
      try {
        // Get embedding for the complete interaction (message + response)
        const contextText = `${interaction.message} ${interaction.response}`;
        const embedding = await this.getEmbedding(contextText);
        
        // Create training sample
        // positive_feedback value should be 0-1, representing user satisfaction
        const sample = {
          embedding,
          label: interaction.positive_feedback || 0.5 // Default to neutral if not provided
        };
        
        trainingData.push(sample);
        
        // Store the embedding for future reference
        const key = this.generateEmbeddingKey(interaction.message);
        this.embeddings[key] = {
          embedding,
          context: contextText,
          feedback: interaction.positive_feedback || 0.5,
          timestamp: Date.now()
        };
      } catch (error) {
        console.error('Error processing interaction for training:', error);
      }
    }
    
    if (trainingData.length === 0) {
      return { success: false, message: 'Failed to prepare training data' };
    }
    
    try {
      // Convert to tensors
      const xs = tf.tensor2d(
        trainingData.map(sample => sample.embedding)
      );
      
      const ys = tf.tensor2d(
        trainingData.map(sample => [sample.label]),
        [trainingData.length, 1]
      );
      
      // Train the model
      const history = await this.model.fit(xs, ys, {
        epochs: 10,
        batchSize: 32,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            console.log(`Epoch ${epoch}: loss = ${logs.loss}, accuracy = ${logs.acc}`);
          }
        }
      });
      
      // Save the updated model and embeddings
      await this.saveModel();
      await this.saveUserEmbeddings();
      
      // Clean up tensors
      xs.dispose();
      ys.dispose();
      
      return {
        success: true,
        message: `Model trained on ${trainingData.length} interactions`,
        history: history.history
      };
    } catch (error) {
      console.error('Error training model:', error);
      return {
        success: false,
        message: 'Error during model training: ' + error.message
      };
    }
  }

  /**
   * Enhance Ollama's response using the trained model
   * @param {string} userMessage - User's message
   * @param {Array<Object>} candidateResponses - Candidate responses to rank
   * @returns {Promise<Object>} - Best response based on learned preferences
   */
  async enhanceResponse(userMessage, candidateResponses) {
    if (!await this.initialize()) {
      console.warn('Falling back to first candidate response due to initialization failure');
      return candidateResponses[0];
    }
    
    if (!ENABLE_TENSORFLOW_LEARNING) {
      return candidateResponses[0];
    }
    
    if (candidateResponses.length === 0) {
      return null;
    }
    
    try {
      // Get embeddings for each candidate response
      const enhancedCandidates = [];
      
      for (const response of candidateResponses) {
        try {
          // Create context by combining user message and response
          const contextText = `${userMessage} ${response.content}`;
          const embedding = await this.getEmbedding(contextText);
          
          // Use model to predict how well this matches user preferences
          const inputTensor = tf.tensor2d([embedding], [1, EMBEDDING_DIM]);
          const prediction = this.model.predict(inputTensor);
          const score = (await prediction.data())[0];
          
          enhancedCandidates.push({
            ...response,
            relevanceScore: score
          });
          
          // Clean up tensors
          inputTensor.dispose();
          prediction.dispose();
        } catch (error) {
          console.error('Error processing candidate response:', error);
          enhancedCandidates.push({
            ...response,
            relevanceScore: 0.5  // Neutral score for failed predictions
          });
        }
      }
      
      // Sort candidates by relevance score
      enhancedCandidates.sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      // Return the highest scoring response
      return enhancedCandidates[0];
    } catch (error) {
      console.error('Error enhancing response:', error);
      // Fallback to the first candidate if enhancement fails
      return candidateResponses[0];
    }
  }

  /**
   * Save the trained model
   */
  async saveModel() {
    if (!this.model) return;
    
    const modelPath = `file://${path.join(MODELS_DIR, `user_${this.userId}_model`)}`;
    try {
      await this.model.save(modelPath);
      console.log(`Model saved for user ${this.userId}`);
    } catch (error) {
      console.error('Error saving model:', error);
    }
  }

  /**
   * Load the trained model
   */
  async loadModel() {
    const modelPath = `file://${path.join(MODELS_DIR, `user_${this.userId}_model`)}`;
    try {
      const model = await tf.loadLayersModel(modelPath);
      return model;
    } catch (error) {
      console.error('Error loading model:', error);
      throw error;
    }
  }

  /**
   * Save user embeddings to file
   */
  async saveUserEmbeddings() {
    try {
      const filePath = path.join(MODELS_DIR, `user_${this.userId}_${USER_EMBEDDINGS_FILE}`);
      await fs.writeFile(filePath, JSON.stringify(this.embeddings, null, 2));
      console.log(`User embeddings saved for user ${this.userId}`);
    } catch (error) {
      console.error('Error saving user embeddings:', error);
    }
  }

  /**
   * Load user embeddings from file
   */
  async loadUserEmbeddings() {
    try {
      const filePath = path.join(MODELS_DIR, `user_${this.userId}_${USER_EMBEDDINGS_FILE}`);
      const data = await fs.readFile(filePath, 'utf8');
      this.embeddings = JSON.parse(data);
      console.log(`Loaded ${Object.keys(this.embeddings).length} user embeddings for user ${this.userId}`);
    } catch (error) {
      // It's okay if the file doesn't exist yet
      console.log(`No existing embeddings found for user ${this.userId}`);
      this.embeddings = {};
    }
  }

  /**
   * Generate a key for storing embeddings
   * @param {string} text - Text to generate key for
   * @returns {string} - Key for embedding lookup
   */
  generateEmbeddingKey(text) {
    // Simple hashing function to create keys
    return Buffer.from(text).toString('base64').substring(0, 24);
  }
}

// Module storage for learner instances
const learners = new Map();

/**
 * Get or create a learner instance for a user
 * @param {string} userId - User ID
 * @returns {Promise<OllamaTensorflowLearner>} - Learner instance
 */
export async function getLearnerForUser(userId) {
  if (!learners.has(userId)) {
    const learner = new OllamaTensorflowLearner(userId);
    await learner.initialize().catch(error => {
      console.error(`Error initializing learner for user ${userId}:`, error);
    });
    learners.set(userId, learner);
  }
  
  return learners.get(userId);
}

/**
 * Get service status information for health checks
 * @returns {Promise<Object>} - Status object with operational information
 */
async function getServiceStatus() {
  const status = {
    operational: isServiceInitialized,
    tensorflow: true,
    ollama: true,
    error: null,
    version: {
      tensorflow: tf.version.tfjs,
      ollama: 'unknown'
    }
  };
  
  try {
    // Check TensorFlow
    try {
      // Create a small test tensor
      const testTensor = tf.tensor1d([1, 2, 3]);
      const result = testTensor.add(tf.tensor1d([4, 5, 6]));
      const sum = result.dataSync().reduce((a, b) => a + b, 0);
      
      // Clean up tensors
      testTensor.dispose();
      result.dispose();
      
      // Tensor operations worked
      status.tensorflow = true;
    } catch (tfError) {
      status.tensorflow = false;
      status.error = `TensorFlow error: ${tfError.message}`;
    }
    
    // Check Ollama with timeout
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Ollama check timed out')), OLLAMA_CONNECT_TIMEOUT);
      });
      
      const ollamaPromise = ollama.list({ host: OLLAMA_HOST });
      
      // Race against timeout
      const ollamaResponse = await Promise.race([ollamaPromise, timeoutPromise]);
      
      // If we get here, Ollama is accessible
      status.ollama = true;
      
      // Try to get the Ollama version
      if (ollamaResponse && ollamaResponse.models && ollamaResponse.models.length > 0) {
        status.version.ollama = ollamaResponse.models[0].name || 'available';
      }
    } catch (ollamaError) {
      status.ollama = false;
      
      // Still consider service operational even if Ollama is down, just with limited functionality
      status.operational = true;
      
      // Add error details
      if (!status.error) {
        status.error = `Ollama error: ${ollamaError.message}`;
      } else {
        status.error += ` | Ollama error: ${ollamaError.message}`;
      }
    }
    
    // Overall service is operational if TensorFlow is working,
    // even if Ollama has issues (we can use fallback embeddings)
    status.operational = status.tensorflow;
    
    return status;
  } catch (error) {
    console.error('Error checking service status:', error);
    return {
      operational: false,
      tensorflow: false,
      ollama: false,
      error: error.message,
      version: {
        tensorflow: tf.version.tfjs,
        ollama: 'unknown'
      }
    };
  }
}

/**
 * Get multiple enhanced responses from Ollama using TensorFlow model
 * @param {string} userId - User ID
 * @param {string} message - User message
 * @param {number} count - Number of candidate responses to generate
 * @returns {Promise<Object>} - Enhanced response
 */
export async function getEnhancedResponse(userId, message, count = 3) {
  try {
    if (!isServiceInitialized && !await initializeService()) {
      throw new Error('TensorFlow learning service is not initialized');
    }
    
    // First, get multiple candidate responses from Ollama
    const candidateResponses = await generateCandidateResponses(message, count);
    
    if (!ENABLE_TENSORFLOW_LEARNING) {
      return candidateResponses[0];
    }
    
    // Get the learner for this user
    const learner = await getLearnerForUser(userId);
    
    // Use the learner to enhance the response
    const enhancedResponse = await learner.enhanceResponse(message, candidateResponses);
    
    return enhancedResponse || candidateResponses[0];
  } catch (error) {
    console.error('Error generating enhanced response:', error);
    
    // Fallback to standard Ollama response if enhancement fails
    try {
      const response = await ollama.chat({
        model: OLLAMA_MODEL,
        messages: [{ role: 'user', content: message }],
        host: OLLAMA_HOST
      });
      
      return response.message;
    } catch (ollamaError) {
      console.error('Ollama fallback also failed:', ollamaError);
      return {
        content: "I'm sorry, I'm having trouble processing your request right now.",
        error: true
      };
    }
  }
}

/**
 * Generate multiple candidate responses from Ollama
 * @param {string} message - User message
 * @param {number} count - Number of responses to generate
 * @returns {Promise<Array<Object>>} - Array of responses
 */
async function generateCandidateResponses(message, count) {
  try {
    const candidates = [];
    
    // Generate multiple responses with different temperatures
    for (let i = 0; i < count; i++) {
      try {
        // Vary temperature to get diverse responses
        const temperature = 0.5 + (i * 0.2);
        
        const response = await ollama.chat({
          model: OLLAMA_MODEL,
          messages: [{ role: 'user', content: message }],
          options: {
            temperature: temperature
          },
          host: OLLAMA_HOST
        });
        
        candidates.push({
          content: response.message.content,
          temperature: temperature
        });
      } catch (error) {
        console.error(`Error generating candidate response ${i}:`, error);
        // Add a placeholder response to maintain the expected count
        candidates.push({
          content: "I'm sorry, I couldn't generate a complete response for this query.",
          temperature: 0.5 + (i * 0.2),
          error: true
        });
      }
    }
    
    return candidates.length > 0 ? candidates : [{
      content: "I'm processing your request, but it's taking longer than expected.",
      temperature: 0.7,
      fallback: true
    }];
  } catch (error) {
    console.error('Error generating candidate responses:', error);
    return [{
      content: "I apologize, but I'm having trouble processing your request right now.",
      temperature: 0.7,
      error: true
    }];
  }
}

/**
 * Train the model with user feedback
 * @param {string} userId - User ID
 * @param {Array<Object>} interactions - User interactions with feedback
 * @returns {Promise<Object>} - Training result
 */
export async function trainWithFeedback(userId, interactions) {
  try {
    if (!isServiceInitialized && !await initializeService()) {
      return {
        success: false,
        message: 'TensorFlow learning service is not initialized',
        error: initializationError?.message
      };
    }
    
    if (!ENABLE_TENSORFLOW_LEARNING) {
      return {
        success: false,
        message: 'TensorFlow learning is disabled by configuration'
      };
    }
    
    const learner = await getLearnerForUser(userId);
    const result = await learner.train(interactions);
    return result;
  } catch (error) {
    console.error('Error training model with feedback:', error);
    return {
      success: false,
      message: 'Error training model: ' + error.message
    };
  }
}

export default {
  getLearnerForUser,
  getEnhancedResponse,
  trainWithFeedback,
  getServiceStatus
}; 