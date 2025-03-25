import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

// Google Calendar API setup
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5002/api/auth/google/callback';

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
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Create calendar event from task details
 * @param {Object} tokenInfo - User's Google OAuth tokens
 * @param {Object} eventDetails - Event details to create
 */
export async function createCalendarEvent(tokenInfo, eventDetails) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials(tokenInfo);

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
  return await calendar.events.insert({
    calendarId: 'primary',
    resource: eventDetails,
  });
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
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials(tokenInfo);

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
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials(tokenInfo);

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
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials(tokenInfo);

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Get user's events
    const userEventsResponse = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });
    
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
    
    return allEvents;
  } catch (error) {
    console.error('Error fetching all events:', error);
    throw error;
  }
}

export default {
  createOAuth2Client,
  getAuthUrl,
  getTokens,
  createCalendarEvent,
  listUpcomingEvents,
  getIndianHolidays,
  getHolidays,
  getAllEvents
}; 