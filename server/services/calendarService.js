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
 * Create an optimal schedule from tasks
 * @param {Object} tokenInfo - User's Google OAuth tokens
 * @param {Array} tasks - Array of tasks to schedule
 * @param {Object} preferences - User's scheduling preferences
 */
export async function createOptimalSchedule(tokenInfo, tasks, preferences) {
  // Get existing calendar events to avoid conflicts
  const existingEvents = await listUpcomingEvents(tokenInfo, 50);
  
  // Convert existing events to busy time slots
  const busySlots = existingEvents.map(event => ({
    start: new Date(event.start.dateTime || event.start.date),
    end: new Date(event.end.dateTime || event.end.date)
  }));
  
  // Get user's working hours from preferences or use defaults
  const workingHours = preferences.workingHours || {
    startHour: 9, // 9 AM
    endHour: 17,  // 5 PM
    workDays: [1, 2, 3, 4, 5] // Monday to Friday
  };
  
  // Sort tasks by priority and deadline
  const sortedTasks = [...tasks].sort((a, b) => {
    // First sort by priority (high, medium, low)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    
    // Then sort by deadline if priority is the same
    if (a.deadline && b.deadline) {
      return new Date(a.deadline) - new Date(b.deadline);
    }
    // Tasks with deadlines come before tasks without deadlines
    if (a.deadline) return -1;
    if (b.deadline) return 1;
    return 0;
  });
  
  // Calculate estimated duration for each task based on complexity or user input
  const tasksWithDuration = sortedTasks.map(task => ({
    ...task,
    duration: task.estimatedDuration || 60 // default 60 minutes if not specified
  }));
  
  // Find available slots in the calendar for each task
  const scheduledEvents = [];
  
  for (const task of tasksWithDuration) {
    const availableSlot = findAvailableSlot(
      busySlots,
      task.duration,
      workingHours,
      new Date(), // Start looking from now
      task.deadline ? new Date(task.deadline) : null
    );
    
    if (availableSlot) {
      // Create event details for this task
      const eventDetails = {
        summary: task.task,
        description: `Priority: ${task.priority}\n${task.description || ''}`,
        start: {
          dateTime: availableSlot.start.toISOString(),
        },
        end: {
          dateTime: availableSlot.end.toISOString(),
        },
        colorId: getColorIdForPriority(task.priority),
      };
      
      // Add to scheduled events
      scheduledEvents.push({
        task: task,
        eventDetails: eventDetails
      });
      
      // Update busy slots to include this new event
      busySlots.push({
        start: availableSlot.start,
        end: availableSlot.end
      });
    }
  }
  
  return scheduledEvents;
}

/**
 * Find an available time slot for a task
 * @param {Array} busySlots - Array of existing busy time slots
 * @param {number} duration - Duration needed in minutes
 * @param {Object} workingHours - User's working hours
 * @param {Date} startDate - Earliest date to consider
 * @param {Date} deadlineDate - Latest date to consider (optional)
 */
function findAvailableSlot(busySlots, duration, workingHours, startDate, deadlineDate) {
  const { startHour, endHour, workDays } = workingHours;
  const durationMs = duration * 60 * 1000; // Convert minutes to milliseconds
  
  // Start from the beginning of the current day or start date
  let currentDate = new Date(startDate);
  currentDate.setHours(startHour, 0, 0, 0);
  
  // If current time is after start hour, start from next working hour
  if (startDate.getHours() >= startHour) {
    currentDate.setHours(startDate.getHours() + 1, 0, 0, 0);
  }
  
  // Loop through days until we find an available slot or hit deadline
  const maxDays = 14; // Don't look more than 2 weeks ahead
  let daysChecked = 0;
  
  while ((!deadlineDate || currentDate < deadlineDate) && daysChecked < maxDays) {
    // Check if current day is a work day
    if (workDays.includes(currentDate.getDay())) {
      // Current day's end time
      const dayEndTime = new Date(currentDate);
      dayEndTime.setHours(endHour, 0, 0, 0);
      
      // Check each potential slot in the day
      while (currentDate < dayEndTime) {
        const slotEndTime = new Date(currentDate.getTime() + durationMs);
        
        // Ensure slot ends before end of working hours
        if (slotEndTime <= dayEndTime) {
          // Check if this slot conflicts with any busy slots
          const hasConflict = busySlots.some(busy => {
            return (currentDate < busy.end && slotEndTime > busy.start);
          });
          
          if (!hasConflict) {
            // Found an available slot
            return {
              start: new Date(currentDate),
              end: slotEndTime
            };
          }
        }
        
        // Move to next potential slot (try 30-minute increments)
        currentDate.setMinutes(currentDate.getMinutes() + 30);
      }
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
    currentDate.setHours(startHour, 0, 0, 0);
    daysChecked++;
  }
  
  // No available slot found within constraints
  return null;
}

/**
 * Get color ID based on task priority
 * @param {string} priority - Task priority (high, medium, low)
 */
function getColorIdForPriority(priority) {
  // Google Calendar color IDs: https://developers.google.com/calendar/api/v3/reference/colors/get
  switch (priority) {
    case 'high': return '4'; // Red
    case 'medium': return '5'; // Yellow
    case 'low': return '7'; // Blue
    default: return '1'; // Blue
  }
}

export default {
  createOAuth2Client,
  getAuthUrl,
  getTokens,
  createCalendarEvent,
  listUpcomingEvents,
  createOptimalSchedule
}; 