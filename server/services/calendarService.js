import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

// Google Calendar API setup
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'https://chatbot-x8x4.onrender.com/api/auth/google/callback';

/**
 * Create OAuth2 client for Google Calendar API
 */
export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );
}

/**
 * Generate authentication URL for Google Calendar
 */
export function getAuthUrl() {
  const oauth2Client = createOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Force to get refresh token
  });
}

/**
 * Exchange authorization code for tokens
 * @param {string} code - Authorization code from Google
 */
export async function getTokens(code) {
  try {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
    
    // Make sure we have valid token data
    if (!tokens || !tokens.access_token) {
      throw new Error('Invalid token response from Google');
    }
    
    // Log token information for debugging (without exposing the actual token)
    console.log('Token received successfully');
    console.log('Token Type:', tokens.token_type);
    console.log('Has Refresh Token:', Boolean(tokens.refresh_token));
    console.log('Expires In:', tokens.expires_in);
    
    // Return clean token object
    return {
      access_token: tokens.access_token,
      token_type: tokens.token_type || 'Bearer',
      expires_in: tokens.expires_in || 3600,
      refresh_token: tokens.refresh_token
    };
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    throw error;
  }
}

/**
 * Create calendar event from task details
 * @param {Object} tokenInfo - User's Google OAuth tokens
 * @param {Object} eventDetails - Event details to create
 */
export async function createCalendarEvent(tokenInfo, eventDetails) {
  try {
    // Extra validation and debugging for token
    console.log('createCalendarEvent called with tokenInfo:', {
      hasTokenInfo: !!tokenInfo,
      hasAccessToken: tokenInfo ? !!tokenInfo.access_token : false,
      tokenType: typeof tokenInfo?.access_token,
      tokenLength: tokenInfo?.access_token?.length
    });
    
    console.log('Event details:', JSON.stringify(eventDetails, null, 2));
    
    // Return mock data if in development mode and ENABLE_MOCK_CALENDAR is true
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode detected - providing mock calendar response');
      return {
        data: {
          id: `mock-event-${Date.now()}`,
          summary: eventDetails.summary,
          description: eventDetails.description || '',
          location: eventDetails.location || '',
          start: eventDetails.start,
          end: eventDetails.end,
          status: 'confirmed',
          created: new Date().toISOString(),
          creator: { email: 'mock-user@example.com' },
          _isMockData: true
        }
      };
    }
    
    // Robust token validation
    if (!tokenInfo) {
      throw new Error('Token info object is required');
    }
    
    // Handle case where token might be a JSON string
    let accessToken = tokenInfo.access_token;
    if (typeof accessToken === 'string' && (accessToken.startsWith('{') || accessToken.startsWith('['))) {
      try {
        const parsed = JSON.parse(accessToken);
        if (parsed && parsed.token) {
          console.log('Parsed nested token object');
          accessToken = parsed.token;
        }
      } catch (e) {
        // Not a JSON string, use as is
        console.log('Access token is not a JSON string');
      }
    }
    
    if (!accessToken) {
      throw new Error('Access token is required');
    }
    
    // Create OAuth client with the token
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: accessToken
    });

    console.log('OAuth client created, calling Google Calendar API');
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
    // Validate event details
    if (!eventDetails || !eventDetails.summary || !eventDetails.start || !eventDetails.end) {
      console.error('Invalid event details:', eventDetails);
      throw new Error('Invalid event details: summary, start, and end are required');
    }
    
    // Make sure the event dates are valid
    const startTime = new Date(eventDetails.start.dateTime);
    const endTime = new Date(eventDetails.end.dateTime);
    
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      console.error('Invalid date format in event:', {
        start: eventDetails.start.dateTime,
        end: eventDetails.end.dateTime,
        startValid: !isNaN(new Date(eventDetails.start.dateTime).getTime()),
        endValid: !isNaN(new Date(eventDetails.end.dateTime).getTime())
      });
      throw new Error('Invalid date format in event details');
    }
    
    // Create a clean event object to avoid any extraneous properties
    const cleanEventDetails = {
      summary: eventDetails.summary,
      description: eventDetails.description || '',
      location: eventDetails.location || '',
      start: {
        dateTime: startTime.toISOString(),
        timeZone: eventDetails.start.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: eventDetails.end.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };
    
    // If there are attendees, include them
    if (eventDetails.attendees && Array.isArray(eventDetails.attendees) && eventDetails.attendees.length > 0) {
      cleanEventDetails.attendees = eventDetails.attendees;
    }
    
    console.log('Sending clean event object to Google:', JSON.stringify(cleanEventDetails));
    
    // Attempt to create event
    try {
      const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: cleanEventDetails,
      });
      
      console.log('Event created successfully:', response.data.id);
      return response;
    } catch (apiError) {
      console.error('Google Calendar API error:', apiError);
      console.error('Error details:', apiError.response?.data || 'No additional details');
      
      // Return mock response in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log('Returning mock response after API error in development mode');
        return {
          data: {
            id: `mock-event-${Date.now()}`,
            summary: eventDetails.summary,
            description: eventDetails.description || '',
            location: eventDetails.location || '',
            start: eventDetails.start,
            end: eventDetails.end,
            status: 'confirmed',
            created: new Date().toISOString(),
            creator: { email: 'mock-user@example.com' },
            _isMockData: true
          }
        };
      }
      
      throw apiError;
    }
  } catch (error) {
    console.error('Error creating calendar event:', error);
    
    // Return mock response in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('Returning mock response after general error in development mode');
      return {
        data: {
          id: `mock-event-${Date.now()}`,
          summary: eventDetails.summary,
          description: eventDetails.description || '',
          location: eventDetails.location || '',
          start: eventDetails.start,
          end: eventDetails.end,
          status: 'confirmed',
          created: new Date().toISOString(),
          creator: { email: 'mock-user@example.com' },
          _isMockData: true
        }
      };
    }
    
    // Check for auth errors to provide better error messages
    if (error.message && (
      error.message.includes('invalid_grant') || 
      error.message.includes('Invalid Credentials')
    )) {
      throw new Error('Invalid Google credentials');
    }
    throw error;
  }
}

/**
 * List upcoming events from user's calendar
 * @param {Object} tokenInfo - User's Google OAuth tokens
 * @param {number} maxResults - Maximum number of events to return
 */
export async function listUpcomingEvents(tokenInfo, maxResults = 10) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials(tokenInfo);

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
  const now = new Date();
  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: now.toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
  });
  
  return response.data.items;
}

/**
 * Get Indian holiday events
 * @param {Object} tokenInfo - User's Google OAuth tokens
 * @param {Date} startDate - Start date for events
 * @param {Date} endDate - End date for events
 */
export async function getIndianHolidays(tokenInfo, startDate, endDate) {
  try {
    // Skip if no tokenInfo
    if (!tokenInfo || !tokenInfo.access_token) {
      console.warn('Skipping Indian holidays - no valid token');
      return [];
    }
    
    // Handle case where token might be a JSON string
    let accessToken = tokenInfo.access_token;
    if (typeof accessToken === 'string' && (accessToken.startsWith('{') || accessToken.startsWith('{'))) {
      try {
        const parsed = JSON.parse(accessToken);
        if (parsed && parsed.token) {
          accessToken = parsed.token;
        }
      } catch (e) {
        // Not a JSON string, use as is
      }
    }
    
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: accessToken
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Holiday calendar ID for Indian holidays
    const calendarId = 'en.indian#holiday@group.v.calendar.google.com';
    
    const response = await calendar.events.list({
      calendarId: calendarId,
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    // Mark events as Indian and holiday
    const events = response.data.items.map(event => ({
      ...event,
      isIndian: true,
      isHoliday: true
    }));
    
    console.log(`Found ${events.length} Indian holidays`);
    return events;
  } catch (error) {
    console.error('Error fetching Indian holidays:', error);
    return [];
  }
}

/**
 * Get holiday events
 * @param {Object} tokenInfo - User's Google OAuth tokens
 * @param {Date} startDate - Start date for events
 * @param {Date} endDate - End date for events
 */
export async function getHolidays(tokenInfo, startDate, endDate) {
  try {
    // Skip if no tokenInfo
    if (!tokenInfo || !tokenInfo.access_token) {
      console.warn('Skipping holidays - no valid token');
      return [];
    }
    
    // Handle case where token might be a JSON string
    let accessToken = tokenInfo.access_token;
    if (typeof accessToken === 'string' && (accessToken.startsWith('{') || accessToken.startsWith('{'))) {
      try {
        const parsed = JSON.parse(accessToken);
        if (parsed && parsed.token) {
          accessToken = parsed.token;
        }
      } catch (e) {
        // Not a JSON string, use as is
      }
    }
    
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: accessToken
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Holiday calendar ID
    const calendarId = 'en.usa#holiday@group.v.calendar.google.com';
    
    const response = await calendar.events.list({
      calendarId: calendarId,
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    // Mark events as holidays
    const events = response.data.items.map(event => ({
      ...event,
      isHoliday: true
    }));
    
    console.log(`Found ${events.length} US holidays`);
    return events;
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return [];
  }
}

/**
 * Get all events from a date range
 * @param {Object} tokenInfo - User's Google OAuth tokens
 * @param {Date} startDate - Start date for events
 * @param {Date} endDate - End date for events
 */
export async function getAllEvents(tokenInfo, startDate, endDate) {
  try {
    // Extra validation and debugging for token
    console.log('getAllEvents called with tokenInfo:', {
      hasTokenInfo: !!tokenInfo,
      hasAccessToken: tokenInfo ? !!tokenInfo.access_token : false,
      tokenType: typeof tokenInfo?.access_token,
      tokenLength: tokenInfo?.access_token?.length
    });
    
    // Robust token validation
    if (!tokenInfo) {
      throw new Error('Token info object is required');
    }
    
    // Handle case where token might be a JSON string
    let accessToken = tokenInfo.access_token;
    if (typeof accessToken === 'string' && (accessToken.startsWith('{') || accessToken.startsWith('{'))) {
      try {
        const parsed = JSON.parse(accessToken);
        if (parsed && parsed.token) {
          console.log('Parsed nested token object');
          accessToken = parsed.token;
        }
      } catch (e) {
        // Not a JSON string, use as is
        console.log('Access token is not a JSON string');
      }
    }
    
    if (!accessToken) {
      throw new Error('Access token is required');
    }
    
    // Create OAuth client with the token
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: accessToken
    });
    
    console.log('OAuth client created for fetching events, date range:',
      startDate.toISOString(), 'to', endDate.toISOString());
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Get user's events
    const userEventsResponse = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    console.log(`Found ${userEventsResponse.data.items.length} user events`);
    
    // Get Indian holidays
    const indianHolidays = await getIndianHolidays(tokenInfo, startDate, endDate);
    
    // Get general holidays
    const holidays = await getHolidays(tokenInfo, startDate, endDate);
    
    // Combine all events
    const allEvents = [
      ...indianHolidays,
      ...userEventsResponse.data.items,
      ...holidays
    ];
    
    console.log(`Returning total of ${allEvents.length} events`);
    return allEvents;
  } catch (error) {
    console.error('Error fetching all events:', error);
    // Check for auth errors to provide better error messages
    if (error.message && (
      error.message.includes('invalid_grant') || 
      error.message.includes('Invalid Credentials')
    )) {
      throw new Error('Invalid Google credentials');
    }
    throw error;
  }
}

/**
 * Update a calendar event
 * @param {Object} tokenInfo - User's Google OAuth tokens
 * @param {string} eventId - ID of the event to update
 * @param {Object} eventDetails - Updated event details
 */
export async function updateCalendarEvent(tokenInfo, eventId, eventDetails) {
  try {
    // Validate token
    if (!tokenInfo || !tokenInfo.access_token) {
      throw new Error('Access token is required');
    }
    
    // Handle case where token might be a JSON string
    let accessToken = tokenInfo.access_token;
    if (typeof accessToken === 'string' && (accessToken.startsWith('{') || accessToken.startsWith('['))) {
      try {
        const parsed = JSON.parse(accessToken);
        if (parsed && parsed.token) {
          accessToken = parsed.token;
        }
      } catch (e) {
        // Not a JSON string, use as is
      }
    }
    
    // Create OAuth client
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: accessToken
    });
    
    // Initialize calendar API
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Validate event ID and details
    if (!eventId) {
      throw new Error('Event ID is required');
    }
    
    if (!eventDetails || !eventDetails.summary) {
      throw new Error('Event details with summary are required');
    }
    
    // Ensure dates are properly formatted
    if (eventDetails.start && !eventDetails.start.timeZone) {
      eventDetails.start.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    
    if (eventDetails.end && !eventDetails.end.timeZone) {
      eventDetails.end.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    
    // Update the event
    const response = await calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      resource: eventDetails
    });
    
    console.log(`Event ${eventId} updated successfully`);
    return response.data;
  } catch (error) {
    console.error('Error updating calendar event:', error);
    throw error;
  }
}

/**
 * Delete a calendar event
 * @param {Object} tokenInfo - User's Google OAuth tokens
 * @param {string} eventId - ID of the event to delete
 */
export async function deleteCalendarEvent(tokenInfo, eventId) {
  try {
    // Validate token
    if (!tokenInfo || !tokenInfo.access_token) {
      throw new Error('Access token is required');
    }
    
    // Handle case where token might be a JSON string
    let accessToken = tokenInfo.access_token;
    if (typeof accessToken === 'string' && (accessToken.startsWith('{') || accessToken.startsWith('['))) {
      try {
        const parsed = JSON.parse(accessToken);
        if (parsed && parsed.token) {
          accessToken = parsed.token;
        }
      } catch (e) {
        // Not a JSON string, use as is
      }
    }
    
    // Create OAuth client
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: accessToken
    });
    
    // Initialize calendar API
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Validate event ID
    if (!eventId) {
      throw new Error('Event ID is required');
    }
    
    // Delete the event
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId
    });
    
    console.log(`Event ${eventId} deleted successfully`);
    return true;
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    throw error;
  }
}

export default {
  createOAuth2Client,
  getAuthUrl,
  getTokens,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  listUpcomingEvents,
  getIndianHolidays,
  getHolidays,
  getAllEvents
}; 