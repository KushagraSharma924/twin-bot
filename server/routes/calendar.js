import express from 'express';
import * as calendarService from '../services/calendarService.js';
import * as aiService from '../services/aiService.js';

const router = express.Router();

/**
 * Create a calendar event
 * POST /api/calendar/create-event
 */
router.post('/create-event', async (req, res) => {
  try {
    let eventDetails = req.body.eventDetails;
    const { accessToken, userId, content } = req.body;
    
    console.log('Calendar create-event received:', {
      hasAccessToken: !!accessToken,
      hasEventDetails: !!eventDetails,
      hasContent: !!content,
      eventSummary: eventDetails?.summary,
      startTime: eventDetails?.start?.dateTime,
      endTime: eventDetails?.end?.dateTime,
      tokenLength: accessToken ? accessToken.length : 0
    });
    
    if (!accessToken) {
      return res.status(400).json({ error: "Access token is required" });
    }
    
    // If we need to extract the event details from text
    if (content && !eventDetails) {
      try {
        const eventJson = await aiService.processNLPTask(content, 'calendar_event');
        
        // Parse JSON with error handling
        try {
          eventDetails = JSON.parse(eventJson);
          
          // Process dates to ensure they're in the right format
          if (eventDetails.start && typeof eventDetails.start === 'string') {
            // If start is a string instead of an object with dateTime
            const startDate = new Date(eventDetails.start);
            if (!isNaN(startDate.getTime())) {
              eventDetails.start = { 
                dateTime: startDate.toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone // Add user's local time zone
              };
            }
          } else if (eventDetails.start && !eventDetails.start.dateTime) {
            // If start doesn't have dateTime property
            const startDate = new Date();
            // Default to 1 hour from now if no time specified
            startDate.setHours(startDate.getHours() + 1);
            eventDetails.start = { 
              dateTime: startDate.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            };
          } else if (eventDetails.start && eventDetails.start.dateTime && !eventDetails.start.timeZone) {
            // If start has dateTime but no timeZone
            eventDetails.start.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          }
          
          // Do the same for end time
          if (eventDetails.end && typeof eventDetails.end === 'string') {
            const endDate = new Date(eventDetails.end);
            if (!isNaN(endDate.getTime())) {
              eventDetails.end = { 
                dateTime: endDate.toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
              };
            }
          } else if (eventDetails.end && !eventDetails.end.dateTime) {
            // If no end time, default to 1 hour after start time
            if (eventDetails.start && eventDetails.start.dateTime) {
              const endDate = new Date(eventDetails.start.dateTime);
              endDate.setHours(endDate.getHours() + 1);
              eventDetails.end = { 
                dateTime: endDate.toISOString(),
                timeZone: eventDetails.start.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
              };
            } else {
              // Fallback if we don't have a start dateTime either
              const endDate = new Date();
              endDate.setHours(endDate.getHours() + 2); // 2 hours from now
              eventDetails.end = { 
                dateTime: endDate.toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
              };
            }
          } else if (eventDetails.end && eventDetails.end.dateTime && !eventDetails.end.timeZone) {
            // If end has dateTime but no timeZone
            eventDetails.end.timeZone = eventDetails.start?.timeZone || 
                                       Intl.DateTimeFormat().resolvedOptions().timeZone;
          }
          
        } catch (jsonError) {
          console.error('Error parsing extracted event JSON:', jsonError);
          return res.status(400).json({ 
            error: "Could not parse event details from content",
            details: jsonError.message
          });
        }
      } catch (nlpError) {
        console.error('Error processing natural language:', nlpError);
        return res.status(500).json({ 
          error: "Failed to extract event details from content",
          details: nlpError.message
        });
      }
    }
    
    // At this point, we should have valid eventDetails
    if (!eventDetails) {
      return res.status(400).json({ error: "No event details provided" });
    }
    
    // Now create the event
    try {
      const createdEvent = await calendarService.createCalendarEvent(
        { access_token: accessToken },
        eventDetails
      );
      
      res.json({ 
        success: true, 
        event: createdEvent,
        message: `Event "${eventDetails.summary}" created successfully`
      });
    } catch (error) {
      // Handle token expiration or invalid tokens
      if (error.message?.includes('invalid_grant') || error.message?.includes('Invalid Credentials')) {
        return res.status(401).json({ error: 'Invalid Google credentials' });
      }
      
      console.error('Error creating calendar event:', error);
      return res.status(500).json({ 
        error: "Failed to create calendar event",
        details: error.message
      });
    }
  } catch (error) {
    console.error('Error in create-event endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get Google Calendar auth URL
 * GET /api/calendar/auth-url
 */
router.get('/auth-url', async (req, res) => {
  try {
    const authUrl = calendarService.getAuthUrl();
    res.json({ url: authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authentication URL' });
  }
});

/**
 * Get calendar events
 * GET /api/calendar/events
 */
router.get('/events', async (req, res) => {
  try {
    const { start, end } = req.query;
    const accessToken = req.headers['x-google-token'];
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Google access token is required' });
    }
    
    // Validate date parameters
    if (!start || !end) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }
    
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    
    try {
      const events = await calendarService.getAllEvents({ access_token: accessToken }, startDate, endDate);
      res.json({ events });
    } catch (error) {
      if (error.message?.includes('invalid_grant') || error.message?.includes('Invalid Credentials')) {
        return res.status(401).json({ error: 'Invalid Google credentials' });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

/**
 * Get holidays
 * GET /api/calendar/holidays
 */
router.get('/holidays', async (req, res) => {
  try {
    const { start, end } = req.query;
    const accessToken = req.headers['x-google-token'];
    
    // Check if token is provided
    if (!accessToken) {
      return res.status(401).json({ error: 'Google access token is required' });
    }
    
    // Validate date parameters
    if (!start || !end) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }
    
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    
    try {
      const holidays = await calendarService.getIndianHolidays(
        { access_token: accessToken },
        startDate,
        endDate
      );
      
      res.json({ holidays });
    } catch (error) {
      if (error.message?.includes('invalid_grant') || error.message?.includes('Invalid Credentials')) {
        return res.status(401).json({ error: 'Invalid Google credentials' });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error fetching holidays:', error);
    res.status(500).json({ error: 'Failed to fetch holidays' });
  }
});

/**
 * Update a calendar event
 * PUT /api/calendar/update-event/:eventId
 */
router.put('/update-event/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    let eventDetails = req.body.eventDetails;
    const { accessToken } = req.body;
    
    console.log('Calendar update-event received:', {
      eventId,
      hasAccessToken: !!accessToken,
      hasEventDetails: !!eventDetails,
      eventSummary: eventDetails?.summary,
      tokenLength: accessToken ? accessToken.length : 0
    });
    
    if (!accessToken) {
      return res.status(400).json({ error: "Access token is required" });
    }
    
    if (!eventId) {
      return res.status(400).json({ error: "Event ID is required" });
    }
    
    if (!eventDetails) {
      return res.status(400).json({ error: "No event details provided" });
    }
    
    // Ensure timezone is set
    if (eventDetails.start && eventDetails.start.dateTime && !eventDetails.start.timeZone) {
      eventDetails.start.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    
    if (eventDetails.end && eventDetails.end.dateTime && !eventDetails.end.timeZone) {
      eventDetails.end.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    
    try {
      const updatedEvent = await calendarService.updateCalendarEvent(
        { access_token: accessToken },
        eventId,
        eventDetails
      );
      
      res.json({ 
        success: true, 
        event: updatedEvent,
        message: `Event "${eventDetails.summary}" updated successfully`
      });
    } catch (error) {
      // Handle token expiration or invalid tokens
      if (error.message?.includes('invalid_grant') || error.message?.includes('Invalid Credentials')) {
        return res.status(401).json({ error: 'Invalid Google credentials' });
      }
      
      console.error('Error updating calendar event:', error);
      return res.status(500).json({ 
        error: "Failed to update calendar event",
        details: error.message
      });
    }
  } catch (error) {
    console.error('Error in update-event endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete a calendar event
 * DELETE /api/calendar/delete-event/:eventId
 */
router.delete('/delete-event/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const accessToken = req.headers['x-google-token'];
    
    console.log('Calendar delete-event received:', {
      eventId,
      hasAccessToken: !!accessToken,
      tokenLength: accessToken ? accessToken.length : 0
    });
    
    if (!accessToken) {
      return res.status(400).json({ error: "Access token is required" });
    }
    
    if (!eventId) {
      return res.status(400).json({ error: "Event ID is required" });
    }
    
    try {
      await calendarService.deleteCalendarEvent(
        { access_token: accessToken },
        eventId
      );
      
      res.json({ 
        success: true,
        message: "Event deleted successfully"
      });
    } catch (error) {
      // Handle token expiration or invalid tokens
      if (error.message?.includes('invalid_grant') || error.message?.includes('Invalid Credentials')) {
        return res.status(401).json({ error: 'Invalid Google credentials' });
      }
      
      console.error('Error deleting calendar event:', error);
      return res.status(500).json({ 
        error: "Failed to delete calendar event",
        details: error.message
      });
    }
  } catch (error) {
    console.error('Error in delete-event endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router; 