import express from 'express';
import * as aiService from '../services/aiService.js';
import * as calendarService from '../services/calendarService.js';

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
    const { message, userId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Process the message using the AI service
    const response = await aiService.processNLPTask(message);
    
    res.json({ response });
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
      
      // Validate the extracted date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(eventDetails.eventDate)) {
        console.error('Invalid date format:', eventDetails.eventDate);
        return res.status(400).json({
          error: 'Invalid date format',
          message: `The extracted date "${eventDetails.eventDate}" is not in the correct format (YYYY-MM-DD).`
        });
      }
      
      // Validate the extracted time format (HH:MM)
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(eventDetails.eventTime)) {
        console.error('Invalid time format:', eventDetails.eventTime);
        return res.status(400).json({
          error: 'Invalid time format',
          message: `The extracted time "${eventDetails.eventTime}" is not in the correct format (HH:MM).`
        });
      }
      
      // Step 2: Add the event to the calendar
      try {
        const result = await aiService.addEventToCalendar(eventDetails, accessToken);
        
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
            message: 'I couldn\'t process the event date and time. Please try again with a clearer date and time format (e.g., "2023-04-15 at 14:30").'
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

export default router; 