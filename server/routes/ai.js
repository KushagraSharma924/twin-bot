import express from 'express';
import * as aiService from '../services/aiService.js';
import * as calendarService from '../services/calendarService.js';
import * as supabaseService from '../services/supabaseService.js';
import * as embeddingService from '../services/embeddingService.js';
import conversationService from '../services/conversationService.js';
import ollamaTensorflowService from '../services/ollamaTensorflowService.js';
import ollamaFallback from '../fallbacks/ollama-fallback.js';

const router = express.Router();

/**
 * Gemini text generation
 * POST /api/ai/gemini
 */
router.post('/gemini', async (req, res) => {
  try {
    const { prompt, model, maxTokens } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    const response = await aiService.generateTextWithGemini(prompt, model, maxTokens);
    
    res.json({ response });
  } catch (error) {
    console.error('AI generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * OpenAI text generation
 * POST /api/ai/openai
 */
router.post('/openai', async (req, res) => {
  try {
    const { prompt, model, maxTokens } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    const response = await aiService.generateTextWithOpenAI(prompt, model, maxTokens);
    
    res.json({ response });
  } catch (error) {
    console.error('OpenAI generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Text embedding
 * POST /api/ai/embed
 */
router.post('/embed', async (req, res) => {
  try {
    const { text, model } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    const embedding = await aiService.getTextEmbedding(text, model);
    
    res.json({ embedding });
  } catch (error) {
    console.error('Text embedding error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Twin bot chat
 * POST /api/twin/chat
 */
router.post('/twin/chat', async (req, res) => {
  try {
    const { message, userId, conversationId } = req.body;
    const accessToken = req.headers['authorization']?.split(' ')[1]; // Get auth token
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Skip Ollama fallback completely - always assume it's available
    const requiresOllama = false; // Force to false
    const serviceStatus = { ollama: true, tensorflow: true }; // Force services to be online
    
    // Check if the message might be a calendar event creation request
    const calendarKeywords = /\b(add|create|schedule|set up|new|make|put|book)\b.+?\b(event|meeting|appointment|call|reminder|birthday|party)\b/i;
    const datePatterns = /\b\d{1,2}[-\/\.]\d{1,2}([-\/\.]\d{2,4})?\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2}(st|nd|rd|th)?(,? \d{4})?\b|\b(tomorrow|next week|next month|today)\b/i;
    
    const isCalendarRequest = calendarKeywords.test(message) && datePatterns.test(message);
    console.log(`Message calendar detection: keywords=${calendarKeywords.test(message)}, dates=${datePatterns.test(message)}`);
    
    if (isCalendarRequest) {
      console.log('Detected calendar event request in chat message:', message);
      
      // Check if we have Google token in localStorage
      let googleToken = null;
      try {
        // Try to get Google token from Authorization header or request body
        googleToken = req.headers['x-google-token'] || req.body.googleToken;
      } catch (e) {
        console.log('No Google token available:', e);
      }
      
      // If we have a Google token, try to create calendar event
      if (googleToken) {
        try {
          console.log('Attempting to create calendar event from chat message');
          
          // Extract event details
          const eventDetails = await aiService.extractEventDetails(message);
          
          if (eventDetails && eventDetails.eventName) {
            console.log('Successfully extracted event details:', eventDetails);
            
            // Create the event
            const result = await aiService.addEventToCalendar(eventDetails, googleToken);
            
            if (result && result.success) {
              // Get or create conversation for this user
              const conversation = conversationService.getOrCreateConversation(userId, conversationId);

              // Add user message to conversation history
              conversationService.addMessage(conversation.id, 'user', message);
              
              // Process the message with Ollama
              const ollamaMessages = conversationService.getMessagesForOllama(conversation.id);
              const aiResponse = await aiService.processNLPTask(message, 'general', ollamaMessages);
              
              // Add AI response to conversation history
              conversationService.addMessage(conversation.id, 'assistant', aiResponse);
              
              return res.json({ 
                response: `${aiResponse}\n\nEvent "${eventDetails.eventName}" has been added to your calendar on ${eventDetails.eventDate}.`,
                calendarEvent: result.event,
                eventDetails: eventDetails,
                conversationId: conversation.id
              });
            }
          }
        } catch (calendarError) {
          console.error('Error creating calendar event from chat:', calendarError);
          // Continue to normal chat if calendar creation fails
        }
      } else {
        console.log('No Google token available for calendar event creation');
      }
    }
    
    // Get or create conversation for this user
    const conversation = conversationService.getOrCreateConversation(userId, conversationId);
    console.log(`Using conversation with ID: ${conversation.id} (${conversation.messages.length} messages in history)`);
    
    // Add user message to conversation history
    conversationService.addMessage(conversation.id, 'user', message);

    // Get formatted messages for Ollama
    const ollamaMessages = conversationService.getMessagesForOllama(conversation.id);
    
    // Process the message using the AI service with conversation history
    const response = await aiService.processNLPTask(message, 'general', ollamaMessages);
    
    // Add AI response to conversation history
    conversationService.addMessage(conversation.id, 'assistant', response);
    
    res.json({ 
      response, 
      conversationId: conversation.id,
      messageCount: conversation.messages.length
    });
  } catch (error) {
    console.error('Chat processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Twin task extraction
 * POST /api/twin/extract-tasks
 */
router.post('/twin/extract-tasks', async (req, res) => {
  try {
    const { content, userId } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    // Process the content to extract tasks
    const tasksResponse = await aiService.processNLPTask(content, 'task_extraction');
    
    // Parse the JSON response
    try {
      const tasks = JSON.parse(tasksResponse);
      res.json({ tasks });
    } catch (parseError) {
      console.error('Error parsing tasks JSON:', parseError);
      res.status(500).json({ 
        error: 'Failed to parse tasks from AI response',
        rawResponse: tasksResponse
      });
    }
  } catch (error) {
    console.error('Task extraction error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Twin calendar event creation
 * POST /api/twin/create-calendar-event
 */
router.post('/twin/create-calendar-event', async (req, res) => {
  try {
    const { message, userId, accessToken } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Google Calendar access token is required' });
    }
    
    // Process the message to extract calendar event details
    const eventJsonResponse = await aiService.processNLPTask(message, 'calendar_event');
    
    try {
      // Parse the event details
      const eventDetails = JSON.parse(eventJsonResponse);
      
      // Normalize the event dates
      if (eventDetails.start && typeof eventDetails.start === 'string') {
        const startDate = new Date(eventDetails.start);
        if (!isNaN(startDate.getTime())) {
          eventDetails.start = { 
            dateTime: startDate.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          };
        }
      }
      
      if (eventDetails.end && typeof eventDetails.end === 'string') {
        const endDate = new Date(eventDetails.end);
        if (!isNaN(endDate.getTime())) {
          eventDetails.end = { 
            dateTime: endDate.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          };
        }
      } else if (eventDetails.start && eventDetails.start.dateTime && !eventDetails.end) {
        // If no end time is specified, default to 1 hour after start
        const endDate = new Date(eventDetails.start.dateTime);
        endDate.setHours(endDate.getHours() + 1);
        eventDetails.end = {
          dateTime: endDate.toISOString(),
          timeZone: eventDetails.start.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
        };
      }
      
      // Create the event using the calendar service
      const result = await calendarService.createCalendarEvent(
        { access_token: accessToken },
        eventDetails
      );
      
      // Return success response
      res.json({ 
        success: true, 
        event: result.data,
        message: `I've created an event "${eventDetails.summary}" for you.` 
      });
    } catch (parseError) {
      console.error('Error parsing calendar event JSON:', parseError);
      res.status(400).json({ 
        error: 'Failed to parse event details',
        rawResponse: eventJsonResponse
      });
    }
  } catch (error) {
    console.error('Calendar event creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Simple calendar event creation from message
 * POST /api/twin/simple-calendar-event
 */
router.post('/twin/simple-calendar-event', async (req, res) => {
  try {
    const { message, userId, accessToken } = req.body;
    
    if (!message) {
      return res.status(400).json({ 
        error: 'Message is required',
        message: 'Please provide a message describing the event you want to create.'
      });
    }
    
    if (!accessToken) {
      return res.status(401).json({ 
        error: 'Google Calendar access token is required',
        message: 'Please connect your Google Calendar account in the Calendar page.'
      });
    }
    
    console.log('Processing calendar event from message:', message);
    
    // Step 1: Extract event details using the Gemini API
    try {
      const eventDetails = await aiService.extractEventDetails(message);
      
      if (!eventDetails || !eventDetails.eventName) {
        return res.status(400).json({ 
          error: 'Could not extract event details from your message',
          message: 'Please provide more specific event information like name, date, and time.'
        });
      }
      
      console.log('Successfully extracted event details:', eventDetails);
      
      // Check if the message doesn't seem to be requesting a calendar event
      if (eventDetails.notCalendarEvent === true) {
        return res.status(400).json({
          error: 'Not recognized as a calendar event request',
          message: 'Your message doesn\'t appear to be requesting a calendar event. Try using phrases like "add event", "schedule", or "create meeting".'
        });
      }
      
      // Step 2: Add the event to the calendar - let addEventToCalendar handle date validation
      try {
        const result = await aiService.addEventToCalendar(eventDetails, accessToken);
        
        // Handle the case where result exists but might indicate failure
        if (result && result.success === false) {
          console.log('Calendar service returned a controlled failure', result);
          
          // Send a 200 OK with the error message since this is a handled case
          return res.json({
            success: false,
            message: result.message,
            mockEvent: result.mockEvent || null
          });
        }
        
        if (!result || !result.event) {
          console.error('No event returned from calendar service');
          return res.status(500).json({
            error: 'Failed to create calendar event',
            message: 'The event could not be created on your calendar. Please try again.'
          });
        }
        
        // Return success response
        res.json({ 
          success: true, 
          event: result.event,
          message: result.message,
          eventDetails: eventDetails
        });
      } catch (calendarError) {
        console.error('Error adding event to calendar:', calendarError);
        
        // Check for specific Google API errors
        if (calendarError.message && (
          calendarError.message.includes('invalid_grant') || 
          calendarError.message.includes('Invalid Credentials')
        )) {
          return res.status(401).json({ 
            error: 'Your Google Calendar authorization has expired',
            message: 'Please reconnect your Google Calendar account in the Calendar page.'
          });
        }
        
        // Check for date conversion errors
        if (calendarError.message && calendarError.message.includes('Invalid date')) {
          return res.status(400).json({
            error: 'Invalid date or time format',
            message: 'I couldn\'t process the event date and time. Please try again with a clearer date and time format.'
          });
        }
        
        return res.status(500).json({ 
          error: 'Failed to add event to calendar',
          details: calendarError.message,
          message: 'There was a problem creating your calendar event. Please try again or check your Calendar settings.'
        });
      }
    } catch (extractError) {
      console.error('Error extracting event details:', extractError);
      return res.status(400).json({ 
        error: 'Failed to understand event details',
        details: extractError.message,
        message: 'I couldn\'t understand the event details from your message. Please try again with a clearer description.'
      });
    }
  } catch (error) {
    console.error('Calendar event creation error:', error);
    res.status(500).json({ 
      error: error.message,
      message: 'An unexpected error occurred while creating your calendar event.'
    });
  }
});

/**
 * List all conversations for a user
 * GET /api/twin/conversations/:userId
 */
router.get('/twin/conversations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const conversations = conversationService.getUserConversations(userId);
    
    res.json({ conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create a new conversation for a user
 * POST /api/twin/conversations/:userId
 */
router.post('/twin/conversations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const conversation = conversationService.getOrCreateConversation(userId);
    
    res.json({ 
      conversationId: conversation.id,
      createdAt: conversation.createdAt 
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete a conversation
 * DELETE /api/twin/conversations/:conversationId
 */
router.delete('/twin/conversations/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    if (!conversationId) {
      return res.status(400).json({ error: 'Conversation ID is required' });
    }
    
    const success = conversationService.deleteConversation(conversationId);
    
    if (!success) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.json({ success: true, message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Clear all expired conversations (admin/maintenance endpoint)
 * POST /api/twin/conversations/maintenance/clear-expired
 */
router.post('/twin/conversations/maintenance/clear-expired', async (req, res) => {
  try {
    // This could be protected with an admin check in a real application
    const clearedCount = conversationService.clearExpiredConversations();
    
    res.json({ 
      success: true, 
      clearedCount,
      message: `Cleared ${clearedCount} expired conversations` 
    });
  } catch (error) {
    console.error('Error clearing expired conversations:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Enhanced Ollama chat with TensorFlow learning
 * POST /api/twin/enhanced-chat
 */
router.post('/twin/enhanced-chat', async (req, res) => {
  try {
    const { message, userId, conversationId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    console.log(`Processing enhanced chat request for user ${userId}`);
    
    // Get or create conversation for this user
    const conversation = conversationService.getOrCreateConversation(userId, conversationId);
    
    // Add user message to conversation history
    conversationService.addMessage(conversation.id, 'user', message);
    
    // Get enhanced response using TensorFlow model
    const enhancedResponse = await ollamaTensorflowService.getEnhancedResponse(userId, message);
    
    // Extract the content from the enhanced response
    const responseContent = enhancedResponse.content || enhancedResponse;
    
    // Add AI response to conversation history
    conversationService.addMessage(conversation.id, 'assistant', responseContent);
    
    res.json({
      response: responseContent,
      conversationId: conversation.id,
      enhanced: true,
      relevanceScore: enhancedResponse.relevanceScore
    });
  } catch (error) {
    console.error('Enhanced chat error:', error);
    
    // Fallback to standard chat if enhanced chat fails
    try {
      const { message, userId, conversationId } = req.body;
      const conversation = conversationService.getOrCreateConversation(userId, conversationId);
      const ollamaMessages = conversationService.getMessagesForOllama(conversation.id);
      const response = await aiService.processNLPTask(message, 'general', ollamaMessages);
      conversationService.addMessage(conversation.id, 'assistant', response);
      
      res.json({
        response,
        conversationId: conversation.id,
        enhanced: false,
        fallback: true
      });
    } catch (fallbackError) {
      console.error('Fallback chat error:', fallbackError);
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * Submit feedback on AI responses for learning
 * POST /api/twin/feedback
 */
router.post('/twin/feedback', async (req, res) => {
  try {
    const { userId, conversationId, messageId, feedback, message, response } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    if (feedback === undefined || feedback < 0 || feedback > 1) {
      return res.status(400).json({ 
        error: 'Feedback score is required and must be between 0 and 1' 
      });
    }
    
    console.log(`Recording feedback for user ${userId}: ${feedback}`);
    
    // Create a training sample from this interaction
    const interaction = {
      message: message,
      response: response,
      positive_feedback: feedback,
      timestamp: Date.now()
    };
    
    // Train the model with this feedback
    const result = await ollamaTensorflowService.trainWithFeedback(userId, [interaction]);
    
    res.json({
      success: true,
      message: 'Feedback recorded successfully',
      trainingResult: result
    });
  } catch (error) {
    console.error('Feedback processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Batch train the Ollama TensorFlow model with historical data
 * POST /api/twin/batch-train
 */
router.post('/twin/batch-train', async (req, res) => {
  try {
    const { userId, interactions } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    if (!interactions || !Array.isArray(interactions) || interactions.length === 0) {
      return res.status(400).json({ error: 'Interactions array is required' });
    }
    
    console.log(`Batch training for user ${userId} with ${interactions.length} interactions`);
    
    // Train the model with all provided interactions
    const result = await ollamaTensorflowService.trainWithFeedback(userId, interactions);
    
    res.json({
      success: true,
      message: `Model trained with ${interactions.length} interactions`,
      result
    });
  } catch (error) {
    console.error('Batch training error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Check TensorFlow learning service health
 * GET /api/twin/tensorflow/status
 */
router.get('/twin/tensorflow/status', async (req, res) => {
  try {
    const status = await ollamaTensorflowService.getServiceStatus();
    res.json(status);
  } catch (error) {
    console.error('Error checking TensorFlow service status:', error);
    res.status(500).json({ 
      operational: false,
      error: error.message 
    });
  }
});

export default router; 