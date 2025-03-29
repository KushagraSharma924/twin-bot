/**
 * Conversation State Management Service for Ollama
 * 
 * This service manages conversation state between users and the AI assistant,
 * enabling context retention across multiple interactions.
 */

import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// In-memory store for conversations
// In a production environment, consider using Redis or a database
const conversationStore = new Map();

// Maximum conversation length to keep in memory (adjust based on Ollama's context window)
const MAX_CONVERSATION_LENGTH = process.env.MAX_CONVERSATION_LENGTH || 20;

// Maximum age of conversation in milliseconds (default: 1 hour)
const CONVERSATION_TTL = process.env.CONVERSATION_TTL || 3600000;

/**
 * Creates a new conversation or retrieves an existing one
 * @param {string} userId - User ID
 * @param {string} conversationId - Optional conversation ID
 * @returns {Object} - Conversation object with ID and messages
 */
export function getOrCreateConversation(userId, conversationId = null) {
  const key = conversationId || `${userId}-${uuidv4()}`;
  
  if (!conversationStore.has(key)) {
    // Create a new conversation
    conversationStore.set(key, {
      id: key,
      userId: userId,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    console.log(`Created new conversation with ID: ${key}`);
  }
  
  // Update the last access time
  const conversation = conversationStore.get(key);
  conversation.updatedAt = Date.now();
  
  return conversation;
}

/**
 * Adds a message to a conversation
 * @param {string} conversationId - Conversation ID
 * @param {string} role - Message role (user or assistant)
 * @param {string} content - Message content
 * @returns {Object} - Updated conversation
 */
export function addMessage(conversationId, role, content) {
  if (!conversationStore.has(conversationId)) {
    throw new Error(`Conversation with ID ${conversationId} not found`);
  }
  
  const conversation = conversationStore.get(conversationId);
  
  // Add the new message
  conversation.messages.push({
    role,
    content,
    timestamp: Date.now()
  });
  
  // Limit the conversation length to prevent context window overflow
  if (conversation.messages.length > MAX_CONVERSATION_LENGTH) {
    // Remove older messages but keep the first system message if present
    if (conversation.messages[0].role === 'system') {
      const systemMessage = conversation.messages.shift();
      conversation.messages = conversation.messages.slice(-MAX_CONVERSATION_LENGTH + 1);
      conversation.messages.unshift(systemMessage);
    } else {
      conversation.messages = conversation.messages.slice(-MAX_CONVERSATION_LENGTH);
    }
  }
  
  // Update the last modified timestamp
  conversation.updatedAt = Date.now();
  
  return conversation;
}

/**
 * Get messages in a format usable by Ollama
 * @param {string} conversationId - Conversation ID
 * @returns {Array} - Array of message objects for Ollama
 */
export function getMessagesForOllama(conversationId) {
  if (!conversationStore.has(conversationId)) {
    return [];
  }
  
  const conversation = conversationStore.get(conversationId);
  
  // Format messages for Ollama
  return conversation.messages.map(msg => ({
    role: msg.role,
    content: msg.content
  }));
}

/**
 * Clear expired conversations (housekeeping function)
 * Should be called periodically to prevent memory leaks
 */
export function clearExpiredConversations() {
  const now = Date.now();
  let cleared = 0;
  
  for (const [key, conversation] of conversationStore.entries()) {
    if (now - conversation.updatedAt > CONVERSATION_TTL) {
      conversationStore.delete(key);
      cleared++;
    }
  }
  
  if (cleared > 0) {
    console.log(`Cleared ${cleared} expired conversations`);
  }
  
  return cleared;
}

/**
 * Delete a specific conversation
 * @param {string} conversationId - Conversation ID
 * @returns {boolean} - Success status
 */
export function deleteConversation(conversationId) {
  if (!conversationStore.has(conversationId)) {
    return false;
  }
  
  conversationStore.delete(conversationId);
  console.log(`Deleted conversation with ID: ${conversationId}`);
  return true;
}

/**
 * Get all conversations for a user
 * @param {string} userId - User ID
 * @returns {Array} - Array of conversation objects
 */
export function getUserConversations(userId) {
  const userConversations = [];
  
  for (const conversation of conversationStore.values()) {
    if (conversation.userId === userId) {
      userConversations.push({
        id: conversation.id,
        messageCount: conversation.messages.length,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt
      });
    }
  }
  
  return userConversations;
}

// Set up a periodic task to clear expired conversations (every hour)
setInterval(clearExpiredConversations, 3600000);

export default {
  getOrCreateConversation,
  addMessage,
  getMessagesForOllama,
  clearExpiredConversations,
  deleteConversation,
  getUserConversations
}; 