import express from 'express';
import * as supabaseService from '../services/supabaseService.js';
import { supabase } from '../config/index.js';
import { authMiddleware } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Add a message to conversation history
 * POST /api/conversations/add
 */
router.post('/add', async (req, res) => {
  try {
    const { message, source, metadata } = req.body;
    const userId = req.user?.id;
    
    // Log the request details with appropriate masking for sensitive data
    console.log('Conversation add request:', {
      messageLength: message ? message.length : 0,
      source,
      userId,
      metadataKeys: metadata ? Object.keys(metadata) : [],
      authorization: req.headers.authorization ? 
        `${req.headers.authorization.substring(0, 15)}...` : 'none'
    });
    
    // Validate required fields
    if (!message) {
      console.warn('Missing required field: message');
      return res.status(400).json({ error: 'Message is required' });
    }
    
    if (!source) {
      console.warn('Missing required field: source');
      return res.status(400).json({ error: 'Source is required' });
    }
    
    if (!userId) {
      console.warn('Missing required field: userId (from authentication)');
      return res.status(401).json({ error: 'User ID is required, please authenticate' });
    }
    
    // Validate source
    if (!['user', 'assistant'].includes(source)) {
      console.warn(`Invalid source value: "${source}"`);
      return res.status(400).json({ error: 'Source must be "user" or "assistant"' });
    }
    
    // Call supabaseService
    console.log(`Calling supabaseService.conversations.addMessage for user ${userId}`);
    const result = await supabaseService.conversations.addMessage(message, source, userId, metadata);
    
    // Check if there was an error from the service
    if (!result.success) {
      console.error('Error from supabaseService:', result.error);
      return res.status(500).json({ error: result.error || 'Failed to add message' });
    }
    
    // Success
    console.log(`Message saved successfully with ID: ${result.id}`);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in /api/conversations/add endpoint:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * Get conversation history for a user
 * GET /api/conversations/history?userId=<userId>&limit=<limit>&offset=<offset>&conversationId=<conversationId>
 */
router.get('/history', async (req, res) => {
  try {
    const { userId, limit, offset, conversationId } = req.query;
    
    if (!userId) {
      console.log('Missing userId in conversation history request');
      return res.status(400).json({ 
        success: false,
        message: 'User ID is required' 
      });
    }
    
    console.log(`Fetching conversation history for user: ${userId}`, {
      limit: limit || 'default',
      offset: offset || 'default',
      conversationId: conversationId || 'none'
    });
    
    // Ensure parameters are properly parsed as numbers if provided
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    const parsedOffset = offset ? parseInt(offset, 10) : undefined;
    
    try {
      const history = await supabaseService.conversations.getHistory(
        userId,
        parsedLimit,
        parsedOffset,
        conversationId || null
      );
      
      // Check if history is empty
      if (!history || history.length === 0) {
        console.log('No conversation history found for user:', userId);
        return res.status(200).json({
          success: true,
          count: 0,
          history: []
        });
      }
      
      console.log(`Successfully retrieved ${history.length} conversation messages`);
      
      // Process the history to ensure metadata is parsed correctly
      const processedHistory = history.map(item => {
        if (item.metadata && typeof item.metadata === 'string') {
          try {
            item.metadata = JSON.parse(item.metadata);
          } catch (e) {
            console.log('Error parsing metadata JSON:', e);
            // Keep original if parsing fails
          }
        }
        return item;
      });
      
      return res.status(200).json({ 
        success: true,
        count: processedHistory.length,
        history: processedHistory
      });
    } catch (dbError) {
      console.error('Database error fetching conversation history:', dbError);
      console.error('Error details:', dbError.stack);
      return res.status(500).json({ 
        success: false,
        message: 'Database error fetching conversation history',
        error: dbError.message,
        code: 'DB_ERROR'
      });
    }
  } catch (error) {
    console.error('Error in conversation history route:', error);
    return res.status(500).json({ 
      success: false,
      message: error.message || 'Server error',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * Delete a conversation
 * POST /api/conversations/delete
 */
router.post('/delete', async (req, res) => {
  try {
    const { conversationId } = req.body;
    const userId = req.user?.id;
    
    // Log the request details
    console.log('Conversation delete request:', {
      conversationId,
      userId,
      authorization: req.headers.authorization ? 
        `${req.headers.authorization.substring(0, 15)}...` : 'none'
    });
    
    // Validate required fields
    if (!conversationId) {
      console.warn('Missing required field: conversationId');
      return res.status(400).json({ error: 'Conversation ID is required' });
    }
    
    if (!userId) {
      console.warn('Missing required field: userId (from authentication)');
      return res.status(401).json({ error: 'User ID is required, please authenticate' });
    }
    
    // Check if database is available
    if (!supabase) {
      console.warn('Database not available, returning success but not actually deleting');
      return res.status(200).json({
        success: true,
        message: 'Conversation marked for deletion (database not available)',
        inMemoryOnly: true
      });
    }
    
    // Delete all messages with this conversation_id for this user
    console.log(`Deleting conversation ${conversationId} for user ${userId}`);
    
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error deleting conversation from database:', error);
      return res.status(500).json({ 
        success: false,
        error: error.message || 'Failed to delete conversation'
      });
    }
    
    // Success
    console.log(`Conversation ${conversationId} deleted successfully`);
    return res.status(200).json({
      success: true,
      message: 'Conversation deleted successfully'
    });
  } catch (error) {
    console.error('Error in /api/conversations/delete endpoint:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

/**
 * @route GET /api/conversations
 * @desc Get all conversations for the current user
 * @access Private
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if supabase is available
    if (!supabase) {
      logger.warn('Supabase not available, returning empty conversations list');
      return res.json({ conversations: [] });
    }
    
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });
    
    if (error) {
      logger.error('Error fetching conversations', { error: error.message, userId });
      return res.status(500).json({ error: 'Error fetching conversations' });
    }
    
    return res.json({ conversations: data });
  } catch (error) {
    logger.error('Error in GET /conversations', { error: error.message });
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @route GET /api/conversations/recent
 * @desc Get recent chat messages from conversations
 * @access Private
 */
router.get('/recent', authMiddleware, async (req, res) => {
  try {
    // Check if user object is available
    if (!req.user || !req.user.id) {
      logger.error('User not authenticated or user ID not available');
      return res.status(401).json({ 
        error: 'Authentication required',
        messages: [
          {
            id: 'fallback-1',
            content: 'What are the latest advancements in artificial intelligence?',
            role: 'user',
            created_at: new Date().toISOString()
          },
          {
            id: 'fallback-2',
            content: 'Explain the principles of quantum computing',
            role: 'user',
            created_at: new Date().toISOString()
          }
        ] 
      });
    }
    
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    
    // If Supabase is not available, return fallback messages
    if (!supabase) {
      logger.warn('Supabase not available, returning fallback messages');
      return res.json({
        messages: [
          {
            id: 'fallback-1',
            content: 'What are the latest advancements in artificial intelligence?',
            role: 'user',
            timestamp: new Date().toISOString()
          },
          {
            id: 'fallback-2',
            content: 'Explain the principles of quantum computing',
            role: 'user',
            timestamp: new Date().toISOString()
          },
          {
            id: 'fallback-3',
            content: 'How is machine learning being applied in healthcare?',
            role: 'user',
            timestamp: new Date().toISOString()
          }
        ]
      });
    }
    
    logger.info(`Fetching recent non-personal conversations for user: ${userId}`);
    
    // Get messages directly from the conversations table
    // Filter for user messages only (source = 'user')
    const { data: messages, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('source', 'user')
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (error) {
      logger.error('Error fetching recent conversations', { error: error.message, userId });
      return res.json({
        messages: [
          {
            id: 'fallback-1',
            content: 'What are the latest advancements in artificial intelligence?',
            role: 'user',
            created_at: new Date().toISOString()
          },
          {
            id: 'fallback-2',
            content: 'Explain the principles of quantum computing',
            role: 'user',
            created_at: new Date().toISOString()
          }
        ]
      });
    }
    
    if (!messages || messages.length === 0) {
      logger.info('No messages found for user, returning fallback messages');
      return res.json({
        messages: [
          {
            id: 'fallback-1',
            content: 'What are the latest advancements in artificial intelligence?',
            role: 'user',
            created_at: new Date().toISOString()
          },
          {
            id: 'fallback-2',
            content: 'Explain the principles of quantum computing',
            role: 'user',
            created_at: new Date().toISOString()
          },
          {
            id: 'fallback-3',
            content: 'How is machine learning being applied in healthcare?',
            role: 'user',
            created_at: new Date().toISOString()
          }
        ]
      });
    }
    
    // Filter out personal messages
    // Personal messages often contain "I", "me", "my", "we", "our" etc.
    const nonPersonalMessages = messages.filter(msg => {
      const content = msg.message?.toLowerCase() || '';
      
      // Skip very short messages
      if (content.length < 10) return false;
      
      // Skip messages that are likely personal questions
      const personalPhrases = ['i ', 'me ', 'my ', 'mine ', 'we ', 'our ', 'us ', 
                               'myself ', 'please ', 'help me', 'can you help', 
                               'email', 'phone', 'address', 'contact'];
                               
      // If the message contains a personal phrase, skip it
      for (const phrase of personalPhrases) {
        if (content.includes(phrase)) return false;
      }
      
      return true;
    });
    
    logger.info(`Found ${nonPersonalMessages.length} non-personal messages out of ${messages.length} total`);
    
    // If we filtered out all messages, return some defaults
    if (nonPersonalMessages.length === 0) {
      logger.info('No non-personal messages found, returning fallback messages');
      return res.json({
        messages: [
          {
            id: 'fallback-1',
            content: 'What are the latest advancements in artificial intelligence?',
            role: 'user',
            created_at: new Date().toISOString()
          },
          {
            id: 'fallback-2',
            content: 'Explain the principles of quantum computing',
            role: 'user',
            created_at: new Date().toISOString()
          },
          {
            id: 'fallback-3',
            content: 'How is machine learning being applied in healthcare?',
            role: 'user',
            created_at: new Date().toISOString()
          }
        ]
      });
    }
    
    // Prepare messages for client consumption
    const transformedMessages = nonPersonalMessages.map(msg => ({
      id: msg.id,
      content: msg.message || '',
      role: 'user',
      created_at: msg.timestamp || new Date().toISOString() // Use timestamp as created_at
    }));
    
    logger.info(`Returning ${transformedMessages.length} non-personal messages to client`);
    return res.json({ messages: transformedMessages });
  } catch (error) {
    logger.error('Error in GET /conversations/recent', { error: error.message });
    return res.status(500).json({
      messages: [
        {
          id: 'fallback-1',
          content: 'What are the latest advancements in artificial intelligence?',
          role: 'user',
          created_at: new Date().toISOString()
        },
        {
          id: 'fallback-2',
          content: 'Explain the principles of quantum computing',
          role: 'user',
          created_at: new Date().toISOString()
        }
      ]
    });
  }
});

/**
 * @route POST /api/conversations
 * @desc Create a new conversation
 * @access Private
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { title } = req.body;
    
    // Check if supabase is available
    if (!supabase) {
      logger.warn('Supabase not available, returning mock conversation');
      return res.status(201).json({ 
        conversation: {
          id: 'mock-' + Date.now(),
          user_id: userId,
          title: title || 'New Conversation',
          created_at: new Date().toISOString()
        } 
      });
    }
    
    // Create a new conversation
    const { data, error } = await supabase
      .from('conversations')
      .insert([{
        user_id: userId,
        title: title || 'New Conversation',
        created_at: new Date().toISOString()
      }])
      .select();
    
    if (error) {
      logger.error('Error creating conversation', { error: error.message, userId });
      return res.status(500).json({ error: 'Error creating conversation' });
    }
    
    return res.status(201).json({ conversation: data[0] });
  } catch (error) {
    logger.error('Error in POST /conversations', { error: error.message });
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router; 