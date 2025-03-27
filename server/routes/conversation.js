import express from 'express';
import * as supabaseService from '../services/supabaseService.js';

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

export default router; 