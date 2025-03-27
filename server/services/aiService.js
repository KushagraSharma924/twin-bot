import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import * as calendarService from '../services/calendarService.js';

// Load environment variables
dotenv.config();

// Google Gemini initialization
const geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(geminiApiKey);

/**
 * Process NLP tasks using Google Gemini
 * @param {string} content - The content to process
 * @param {string} task - The type of task (general, task_extraction, or calendar_event)
 * @returns {Promise<string>} - The processed response
 */
export async function processNLPTask(content, task = 'general') {
  try {
    console.log('Gemini configuration:');
    console.log('- Task:', task);

    let systemPrompt = "You are an AI digital twin assistant. Be concise.";
    
    if (task === 'task_extraction') {
      systemPrompt = `Extract actionable tasks from the following text. Format as a JSON array of task objects with:
- 'task': string - The task description
- 'priority': string - Either "high", "medium", or "low"
- 'deadline': string - Deadline in format YYYY-MM-DD if specific date is mentioned, or can be relative like "today", "tomorrow", or day of week like "Friday"
Return only the raw JSON without markdown formatting or code blocks.`;
    } else if (task === 'calendar_event') {
      systemPrompt = `Create a calendar event from the following request. Format as a JSON object with:
- 'summary': string - Event title
- 'description': string - Event description
- 'location': string - Event location (empty string if none)
- 'start': object - With 'dateTime' in ISO format (YYYY-MM-DDTHH:MM:SS) and 'timeZone' property (e.g., "America/New_York")
- 'end': object - With 'dateTime' in ISO format (YYYY-MM-DDTHH:MM:SS) and 'timeZone' property (e.g., "America/New_York")
- 'attendees': array - List of objects with 'email' property (empty array if none)

Be precise with dates and times. If a specific time is mentioned, use that exact time. If only a date is mentioned with no time, use 9:00 AM as the default start time.
If no end time is specified, set the end time to 1 hour after the start time.
If the request doesn't specify a date, assume the event is for today unless it contains words like "tomorrow", "next week", etc.
Use the current time zone for 'timeZone' fields.
Extract any mentioned attendees by their email addresses.

Return only the raw JSON without markdown formatting or code blocks.`;
    }
    
    console.log('Making API call to Gemini...');
    
    // Get the Gemini Pro model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Generate content with the model
    const result = await model.generateContent([
      systemPrompt,
      content
    ]);
    
    const response = result.response;
    let responseText = response.text();
    
    // Handle responses with markdown code blocks (especially for JSON responses)
    if (task === 'task_extraction' || task === 'calendar_event') {
      // Remove markdown code blocks if present
      if (responseText.includes('```')) {
        // Extract content between code blocks
        const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch && codeBlockMatch[1]) {
          responseText = codeBlockMatch[1].trim();
        }
      }
      
      // Handle extra comments outside JSON for calendar events
      if (task === 'calendar_event') {
        try {
          // Try to find valid JSON in the response
          const jsonMatch = responseText.match(/(\{[\s\S]*\})/);
          if (jsonMatch && jsonMatch[1]) {
            // Test if this is valid JSON
            JSON.parse(jsonMatch[1]);
            responseText = jsonMatch[1].trim();
          }
        } catch (e) {
          // Not a valid JSON, leave as is
          console.log('Could not extract clean JSON from response');
        }
      }
    }
    
    return responseText;
  } catch (error) {
    console.error("NLP processing error:", error);
    throw error;
  }
}

/**
 * Process NLP tasks with streaming responses
 * @param {string} content - The content to process
 * @param {Function} callback - Callback for streaming chunks
 * @param {string} task - The type of task
 * @returns {Promise<string>} - The complete response
 */
export async function processNLPTaskStreaming(content, callback, task = 'general') {
  try {
    let systemPrompt = "You are an AI digital twin assistant. Be concise.";
    
    if (task === 'task_extraction') {
      systemPrompt = "Extract actionable tasks from the text. Be concise.";
    } else if (task === 'calendar_event') {
      systemPrompt = "Create a calendar event from this request. Be concise.";
    }
    
    // Get the Gemini Pro model
    const model = genAI.getGenerativeModel({ 
      model: "gemini-pro",
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    });
    
    // Generate content with streaming
    const streamingResult = await model.generateContentStream([
      systemPrompt,
      content
    ]);
    
    let fullResponse = '';
    
    // Process the streaming response
    for await (const chunk of streamingResult.stream) {
      const chunkText = chunk.text();
      fullResponse += chunkText;
      callback(fullResponse);
    }
    
    return fullResponse;
  } catch (error) {
    console.error("Streaming NLP processing error:", error);
    throw error;
  }
}

/**
 * Parse natural language date expressions
 * @param {string} text - Text containing date information
 * @returns {string|null} - ISO date string (YYYY-MM-DD) or null if not found
 */
function parseNaturalLanguageDate(text) {
  const today = new Date();
  
  // Handle day names (Monday, Tuesday, etc.)
  const dayNames = {
    'sunday': 0, 'sun': 0,
    'monday': 1, 'mon': 1,
    'tuesday': 2, 'tue': 2, 'tues': 2,
    'wednesday': 3, 'wed': 3,
    'thursday': 4, 'thu': 4, 'thurs': 4,
    'friday': 5, 'fri': 5,
    'saturday': 6, 'sat': 6
  };
  
  // Handle month names (January, February, etc.)
  const monthNames = {
    'january': 0, 'jan': 0,
    'february': 1, 'feb': 1,
    'march': 2, 'mar': 2,
    'april': 3, 'apr': 3,
    'may': 4,
    'june': 5, 'jun': 5,
    'july': 6, 'jul': 6,
    'august': 7, 'aug': 7,
    'september': 8, 'sep': 8, 'sept': 8,
    'october': 9, 'oct': 9,
    'november': 10, 'nov': 10,
    'december': 11, 'dec': 11
  };
  
  const lowerText = text.toLowerCase();
  
  // 1. Check for "tomorrow", "today", etc.
  if (lowerText.includes('tomorrow')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }
  
  if (lowerText.includes('today')) {
    return today.toISOString().split('T')[0];
  }
  
  if (lowerText.includes('next week')) {
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString().split('T')[0];
  }
  
  // 2. Handle "this coming Monday" or "next Monday"
  for (const [dayName, dayIndex] of Object.entries(dayNames)) {
    // Look for expressions like "next Monday" or "this coming Monday"
    const nextDayMatch = new RegExp(`(?:next|this coming)\\s+${dayName}`, 'i').exec(lowerText);
    if (nextDayMatch) {
      const targetDay = dayIndex;
      const today = new Date();
      const currentDay = today.getDay();
      const daysToAdd = (targetDay + 7 - currentDay) % 7 || 7; // If today, push to next week
      
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + daysToAdd);
      return nextDate.toISOString().split('T')[0];
    }
    
    // Just "Monday" typically means the coming Monday
    const simpleDayMatch = new RegExp(`\\b${dayName}\\b`, 'i').exec(lowerText);
    if (simpleDayMatch) {
      const targetDay = dayIndex;
      const today = new Date();
      const currentDay = today.getDay();
      const daysToAdd = (targetDay + 7 - currentDay) % 7;
      
      // If today is the mentioned day, use today
      if (daysToAdd === 0) {
        return today.toISOString().split('T')[0];
      }
      
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + daysToAdd);
      return nextDate.toISOString().split('T')[0];
    }
  }
  
  // 3. Handle month and day formats (e.g., "April 15" or "15th of April")
  const monthDayPattern = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t)?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i;
  const monthDayMatch = monthDayPattern.exec(lowerText);
  
  if (monthDayMatch) {
    const monthName = monthDayMatch[1].toLowerCase();
    const day = parseInt(monthDayMatch[2], 10);
    const monthIndex = monthNames[monthName] || monthNames[monthName.substring(0, 3)];
    
    if (monthIndex !== undefined && day >= 1 && day <= 31) {
      const year = today.getFullYear();
      // If the month/day has already passed this year, assume next year
      const date = new Date(year, monthIndex, day);
      if (date < today) {
        date.setFullYear(year + 1);
      }
      return date.toISOString().split('T')[0];
    }
  }
  
  // 4. Handle "day month" format (e.g., "15 April" or "15th of April")
  const dayMonthPattern = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t)?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i;
  const dayMonthMatch = dayMonthPattern.exec(lowerText);
  
  if (dayMonthMatch) {
    const day = parseInt(dayMonthMatch[1], 10);
    const monthName = dayMonthMatch[2].toLowerCase();
    const monthIndex = monthNames[monthName] || monthNames[monthName.substring(0, 3)];
    
    if (monthIndex !== undefined && day >= 1 && day <= 31) {
      const year = today.getFullYear();
      // If the month/day has already passed this year, assume next year
      const date = new Date(year, monthIndex, day);
      if (date < today) {
        date.setFullYear(year + 1);
      }
      return date.toISOString().split('T')[0];
    }
  }
  
  // 5. Handle MM/DD or DD/MM ambiguous formats (always prefer DD/MM)
  const slashPattern = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/;
  const slashMatch = slashPattern.exec(lowerText);
  
  if (slashMatch) {
    // Interpret as DD/MM format
    const day = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10) - 1; // JS months are 0-indexed
    const yearMatch = slashMatch[3];
    const year = yearMatch ? (yearMatch.length === 2 ? 2000 + parseInt(yearMatch, 10) : parseInt(yearMatch, 10)) : today.getFullYear();
    
    // Validate
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const date = new Date(year, month, day);
      return date.toISOString().split('T')[0];
    }
  }
  
  // 6. Handle ISO format YYYY-MM-DD
  const isoPattern = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/;
  const isoMatch = isoPattern.exec(lowerText);
  
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const date = new Date(year, month, day);
      return date.toISOString().split('T')[0];
    }
  }
  
  return null;
}

/**
 * Parse natural language time expressions
 * @param {string} text - Text containing time information
 * @returns {string|null} - Time string in HH:MM format or null if not found
 */
function parseNaturalLanguageTime(text) {
  const lowerText = text.toLowerCase();
  
  // Common time expressions
  if (lowerText.includes('noon') || lowerText.includes('12 pm') || lowerText.includes('12pm')) {
    return '12:00';
  }
  
  if (lowerText.includes('midnight') || lowerText.includes('12 am') || lowerText.includes('12am')) {
    return '00:00';
  }
  
  // Handle expressions like "in the morning", "afternoon", "evening"
  if (lowerText.includes('morning')) {
    return '09:00'; // Default morning time
  }
  
  if (lowerText.includes('afternoon')) {
    return '14:00'; // Default afternoon time
  }
  
  if (lowerText.includes('evening')) {
    return '18:00'; // Default evening time
  }
  
  if (lowerText.includes('night')) {
    return '20:00'; // Default night time
  }
  
  // Handle specific times with different formats
  
  // 1. HH:MM format (24-hour)
  const timePattern24h = /\b(\d{1,2}):(\d{2})\b/;
  const timeMatch24h = timePattern24h.exec(lowerText);
  
  if (timeMatch24h) {
    const hours = parseInt(timeMatch24h[1], 10);
    const minutes = timeMatch24h[2];
    
    if (hours >= 0 && hours <= 23) {
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }
  }
  
  // 2. HH:MM AM/PM format
  const timePatternAMPM = /\b(\d{1,2}):(\d{2})\s*(am|pm)\b/i;
  const timeMatchAMPM = timePatternAMPM.exec(lowerText);
  
  if (timeMatchAMPM) {
    let hours = parseInt(timeMatchAMPM[1], 10);
    const minutes = timeMatchAMPM[2];
    const period = timeMatchAMPM[3].toLowerCase();
    
    // Convert to 24-hour format
    if (period === 'pm' && hours < 12) {
      hours += 12;
    } else if (period === 'am' && hours === 12) {
      hours = 0;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }
  
  // 3. H AM/PM format (e.g., "3 pm")
  const shortTimePatternAMPM = /\b(\d{1,2})\s*(am|pm)\b/i;
  const shortTimeMatchAMPM = shortTimePatternAMPM.exec(lowerText);
  
  if (shortTimeMatchAMPM) {
    let hours = parseInt(shortTimeMatchAMPM[1], 10);
    const period = shortTimeMatchAMPM[2].toLowerCase();
    
    // Convert to 24-hour format
    if (period === 'pm' && hours < 12) {
      hours += 12;
    } else if (period === 'am' && hours === 12) {
      hours = 0;
    }
    
    return `${hours.toString().padStart(2, '0')}:00`;
  }
  
  // Default to null if no time found
  return null;
}

/**
 * Extract event details specifically for calendar integration
 * @param {string} userMessage - The user's message about the event
 * @returns {Promise<Object>} - Parsed event details (eventName, eventDate, eventTime)
 */
export async function extractEventDetails(userMessage) {
  try {
    console.log('Extracting event details from:', userMessage);
    
    // Pre-process the message to fix common date formatting issues
    const preprocessedMessage = userMessage.replace(/(\d+)\/(\d+)(\d{4})/g, '$1/$2/$3');
    
    console.log('Preprocessed message:', preprocessedMessage);

    // Use our custom date and time parsers before calling the AI
    const extractedDate = parseNaturalLanguageDate(preprocessedMessage);
    const extractedTime = parseNaturalLanguageTime(preprocessedMessage);
    
    if (extractedDate) {
      console.log('Directly extracted date from message:', extractedDate);
    }
    
    if (extractedTime) {
      console.log('Directly extracted time from message:', extractedTime);
    }
    
    // Create a more specific system prompt for calendar event extraction
    const systemPrompt = `Extract the event name, date, time, and location from the following text. You are an advanced AI that can understand natural language references to dates and times.

Return ONLY the raw JSON with this exact format: 
{
  "eventName": "The name of the event", 
  "eventDate": "YYYY-MM-DD", 
  "eventTime": "HH:MM",
  "location": "Location if mentioned, otherwise empty string",
  "description": "Any additional details about the event"
}

IMPORTANT INSTRUCTIONS:
1. For ambiguous date formats (like "3/4"), ALWAYS interpret as "Day/Month" format (April 3), NOT "Month/Day" (March 4)
2. Accept ANY date format the user provides (MM/DD/YYYY, DD/MM/YYYY, dates like "April 1st", "1st of April", etc.) and convert to YYYY-MM-DD
3. Understand relative dates like "tomorrow", "next week", "this Friday" and convert them to the appropriate YYYY-MM-DD
4. Be smart about event names - if the user has a typo in common event types like "brithday" or "partyy", correct it to "birthday" or "party"
5. If the user is vague about the event name, infer a reasonable name from context
6. If a date is not explicitly mentioned, use today's date
7. If a time is not mentioned, use "09:00" as the default time
8. Determine if the text is describing a calendar event at all. If it's not clearly asking to create or add an event, return a special flag

Remember:
- ALWAYS interpret ambiguous dates like "3/4" or "5/6" as "day/month" format (April 3, June 5)
- You can handle dates like "April 1", "1st April", "April 1st 2025", "next Monday", "tomorrow", etc.
- You can understand phrases like "Schedule a", "Add event", "Create a meeting", etc.
- Correct common typos in event names and types`;

    // Get the Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Generate content with the model
    const result = await model.generateContent([
      systemPrompt,
      preprocessedMessage
    ]);
    
    const response = result.response;
    let responseText = response.text();
    
    // Clean up the response - remove any markdown code blocks
    if (responseText.includes('```')) {
      const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch && codeBlockMatch[1]) {
        responseText = codeBlockMatch[1].trim();
      }
    }
    
    // Handle possible additional text by extracting just the JSON
    try {
      const jsonMatch = responseText.match(/(\{[\s\S]*\})/);
      if (jsonMatch && jsonMatch[1]) {
        const parsed = JSON.parse(jsonMatch[1]);
        
        // If we have directly extracted values, override the AI results
        if (extractedDate) {
          parsed.eventDate = extractedDate;
        }
        
        if (extractedTime) {
          parsed.eventTime = extractedTime;
        }
        
        // Log the extracted event details with a clear date indicator
        console.log('Extracted event details:', parsed);
        console.log(`Event date after extraction: ${parsed.eventDate} (${new Date(parsed.eventDate).toLocaleDateString()})`);
        
        return parsed;
      }
    } catch (e) {
      console.error('Error parsing extracted event JSON:', e);
    }
    
    // Try to parse the whole response as JSON
    try {
      const eventDetails = JSON.parse(responseText);
      
      // If we have directly extracted values, override the AI results
      if (extractedDate) {
        eventDetails.eventDate = extractedDate;
      }
      
      if (extractedTime) {
        eventDetails.eventTime = extractedTime;
      }
      
      // Log the extracted event details with a clear date indicator
      console.log('Extracted event details:', eventDetails);
      console.log(`Event date after extraction: ${eventDetails.eventDate} (${new Date(eventDetails.eventDate).toLocaleDateString()})`);
      
      return eventDetails;
    } catch (parseError) {
      console.error('Could not parse event details:', parseError);
      
      // If we have directly extracted the date and time, create a basic event
      if (extractedDate) {
        console.log('Creating fallback event using directly extracted date/time');
        
        // Extract a simple event name if possible
        const eventName = extractEventNameFromMessage(preprocessedMessage) || "New Event";
        
        return {
          eventName: eventName,
          eventDate: extractedDate,
          eventTime: extractedTime || "09:00",
          location: "",
          description: ""
        };
      }
      
      throw new Error('Could not extract event details from the message');
    }
  } catch (error) {
    console.error('Error extracting event details:', error);
    throw error;
  }
}

/**
 * Extract a basic event name from message text
 * @param {string} text - Message text
 * @returns {string|null} - Extracted event name or null if not found
 */
function extractEventNameFromMessage(text) {
  const lowerText = text.toLowerCase();
  
  // Common event types to look for
  const eventTypes = [
    'meeting', 'call', 'appointment', 'interview', 'conference',
    'party', 'dinner', 'lunch', 'breakfast', 'coffee',
    'birthday', 'anniversary', 'celebration',
    'class', 'lecture', 'seminar', 'workshop'
  ];
  
  // Check if any event type is mentioned
  for (const eventType of eventTypes) {
    if (lowerText.includes(eventType)) {
      // Try to extract a more specific name by looking for descriptors before the event type
      const pattern = new RegExp(`\\b([\\w\\s]{1,20}?)\\s+${eventType}\\b`, 'i');
      const match = pattern.exec(text);
      
      if (match && match[1] && match[1].length > 0 && 
          !['a', 'an', 'the', 'my', 'our', 'your', 'their', 'new', 'some'].includes(match[1].trim().toLowerCase())) {
        // Capitalize the first letter of each word
        const descriptor = match[1].trim().replace(/\b\w/g, c => c.toUpperCase());
        return `${descriptor} ${eventType.charAt(0).toUpperCase() + eventType.slice(1)}`;
      }
      
      // Just use the event type if no good descriptor
      return eventType.charAt(0).toUpperCase() + eventType.slice(1);
    }
  }
  
  // Fallback for when no specific event type is found
  return "New Event";
}

/**
 * Validate and potentially correct ambiguous date formats
 * @param {Object} eventDetails - The event details to validate
 * @returns {Object} - Corrected event details
 */
function validateAndCorrectEventDate(eventDetails) {
  if (!eventDetails || !eventDetails.eventDate) {
    return eventDetails;
  }
  
  console.log('Validating date format for:', eventDetails.eventDate);
  
  // Check if the date looks like a valid ISO format
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (isoDateRegex.test(eventDetails.eventDate)) {
    console.log('Date is in valid ISO format');
    return eventDetails;
  }
  
  // Try to handle ambiguous formats like MM/DD or DD/MM
  // We'll assume DD/MM for consistency as specified in our prompt
  const ambiguousDateRegex = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/;
  const match = eventDetails.eventDate.match(ambiguousDateRegex);
  
  if (match) {
    const firstNumber = parseInt(match[1], 10);
    const secondNumber = parseInt(match[2], 10);
    const year = match[3] ? parseInt(match[3], 10) : new Date().getFullYear();
    
    // Always interpret as DD/MM/YYYY
    // Ensure the month is valid (1-12)
    if (secondNumber >= 1 && secondNumber <= 12) {
      // Create a new date with day/month/year format
      const correctedDate = new Date(year, secondNumber - 1, firstNumber);
      
      // Format as YYYY-MM-DD
      const correctedIsoDate = correctedDate.toISOString().split('T')[0];
      
      console.log(`Corrected ambiguous date format from ${eventDetails.eventDate} to ${correctedIsoDate} (DD/MM interpretation)`);
      
      // Return a new object with the corrected date
      return {
        ...eventDetails,
        eventDate: correctedIsoDate
      };
    }
  }
  
  // If we can't correct it, return the original details
  return eventDetails;
}

/**
 * Create calendar event from extracted details
 * @param {Object} eventDetails - The extracted event details
 * @param {string} accessToken - Google access token
 * @returns {Promise<Object>} - Created event details
 */
export async function addEventToCalendar(eventDetails, accessToken) {
  try {
    console.log('Adding event to calendar with original details:', JSON.stringify(eventDetails));
    
    // Validate and potentially correct date formats
    const correctedEventDetails = validateAndCorrectEventDate(eventDetails);
    
    if (correctedEventDetails !== eventDetails) {
      console.log('Event details were corrected during validation');
      eventDetails = correctedEventDetails;
    }
    
    if (!eventDetails.eventName || !eventDetails.eventDate) {
      throw new Error('Missing required event information');
    }
    
    // Default time if not provided
    if (!eventDetails.eventTime) {
      console.log('No time provided, defaulting to 9:00 AM');
      eventDetails.eventTime = '09:00';
    }
    
    // Try to handle more time formats
    const timeFormats = [
      // Standard format HH:MM
      { regex: /^(\d{1,2}):(\d{2})$/, handler: (match) => {
        const hours = parseInt(match[1], 10);
        const minutes = match[2];
        if (hours >= 0 && hours <= 23) {
          return `${hours.toString().padStart(2, '0')}:${minutes}`;
        }
        return null;
      }},
      // AM/PM format
      { regex: /^(\d{1,2}):?(\d{2})?\s*(am|pm)$/i, handler: (match) => {
        let hours = parseInt(match[1], 10);
        const minutes = match[2] || '00';
        const period = match[3].toLowerCase();
        
        if (period === 'pm' && hours < 12) {
          hours += 12;
        } else if (period === 'am' && hours === 12) {
          hours = 0;
        }
        
        return `${hours.toString().padStart(2, '0')}:${minutes}`;
      }},
      // Simple hour AM/PM
      { regex: /^(\d{1,2})\s*(am|pm)$/i, handler: (match) => {
        let hours = parseInt(match[1], 10);
        const period = match[2].toLowerCase();
        
        if (period === 'pm' && hours < 12) {
          hours += 12;
        } else if (period === 'am' && hours === 12) {
          hours = 0;
        }
        
        return `${hours.toString().padStart(2, '0')}:00`;
      }}
    ];
    
    // Try to normalize the time format
    if (eventDetails.eventTime && typeof eventDetails.eventTime === 'string') {
      const timeStr = eventDetails.eventTime.toLowerCase().trim();
      
      // Handle special time expressions
      if (timeStr === 'noon' || timeStr === 'midday') {
        eventDetails.eventTime = '12:00';
      } else if (timeStr === 'midnight') {
        eventDetails.eventTime = '00:00';
      } else if (timeStr === 'morning') {
        eventDetails.eventTime = '09:00';
      } else if (timeStr === 'afternoon') {
        eventDetails.eventTime = '14:00';
      } else if (timeStr === 'evening') {
        eventDetails.eventTime = '18:00';
      } else if (timeStr === 'night') {
        eventDetails.eventTime = '20:00';
      } else {
        // Try time format converters
        for (const format of timeFormats) {
          const match = timeStr.match(format.regex);
          if (match) {
            const normalizedTime = format.handler(match);
            if (normalizedTime) {
              eventDetails.eventTime = normalizedTime;
              break;
            }
          }
        }
      }
    }
    
    // Convert to Google Calendar format
    const startDateTime = new Date(`${eventDetails.eventDate}T${eventDetails.eventTime}:00`);
    
    // If date conversion failed, try a more flexible approach
    if (isNaN(startDateTime.getTime())) {
      console.error('Date parsing failed for:', eventDetails.eventDate, eventDetails.eventTime);
      
      // Try alternative date format handling
      const parsedDate = parseNaturalLanguageDate(eventDetails.eventDate);
      const parsedTime = parseNaturalLanguageTime(eventDetails.eventTime || '');
      
      if (parsedDate && parsedTime) {
        console.log('Successfully parsed date and time using natural language parsers');
        const newStartDateTime = new Date(`${parsedDate}T${parsedTime}:00`);
        
        if (!isNaN(newStartDateTime.getTime())) {
          console.log('Fixed date parsing using natural language helpers');
          eventDetails.eventDate = parsedDate;
          eventDetails.eventTime = parsedTime;
          
          // Try again with corrected values
          return addEventToCalendar(eventDetails, accessToken);
        }
      }
      
      throw new Error(`Invalid date format: ${eventDetails.eventDate} or time: ${eventDetails.eventTime}`);
    }
    
    // Default to 1-hour events unless duration is specified
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); 
    
    console.log('Parsed dates:', {
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
      isValidStart: !isNaN(startDateTime.getTime()),
      isValidEnd: !isNaN(endDateTime.getTime())
    });
    
    // Create event object in Google Calendar format
    const event = {
      summary: eventDetails.eventName,
      location: eventDetails.location || '',
      description: eventDetails.description || '',
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };
    
    console.log('Creating calendar event with formatted event:', JSON.stringify(event));
    
    // Use the calendarService to create the event
    const result = await calendarService.createCalendarEvent(
      { access_token: accessToken },
      event
    );
    
    console.log('Calendar event creation result:', result ? 'Success' : 'Failed');
    if (result && result.data) {
      console.log('Created event with ID:', result.data.id);
    }
    
    // Format a nice success message showing the date in a human-readable format
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = startDateTime.toLocaleDateString(undefined, dateOptions);
    const formattedTime = startDateTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    
    return {
      success: true,
      event: result.data,
      message: `Event "${eventDetails.eventName}" added to your calendar on ${formattedDate} at ${formattedTime}`
    };
  } catch (error) {
    console.error('Error adding event to calendar:', error);
    throw error;
  }
}

/**
 * Generate insights from research content
 * @param {string} content - The research content to analyze
 * @param {string} context - Additional context like the research query
 * @returns {Promise<Object>} - Insights object with key points
 */
export async function generateResearchInsights(content, context = '') {
  try {
    console.log('Generating research insights', { contentLength: content.length, context });
    
    // In a production environment, this would call a real AI model
    // For demo purposes, we're generating mock insights
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Generate some relevant insights based on the context
    const insights = [];
    
    if (context.toLowerCase().includes('ai') || content.toLowerCase().includes('ai')) {
      insights.push('AI models show increasing capability for complex reasoning tasks');
      insights.push('Ethical considerations remain a primary concern in deployment');
      insights.push('Data quality significantly impacts model performance');
    }
    
    if (context.toLowerCase().includes('security') || content.toLowerCase().includes('security')) {
      insights.push('New attack vectors emerging in distributed systems');
      insights.push('Zero-trust architecture adoption increasing in enterprise');
      insights.push('AI-powered detection systems reducing false positives by 37%');
    }
    
    if (context.toLowerCase().includes('blockchain') || content.toLowerCase().includes('blockchain')) {
      insights.push('Layer 2 solutions addressing scalability concerns');
      insights.push('Enterprise adoption focusing on private blockchain implementations');
      insights.push('Regulatory frameworks evolving rapidly across jurisdictions');
    }
    
    // Default insights if none match
    if (insights.length === 0) {
      insights.push('Multiple methodologies compared showing varied efficacy');
      insights.push('Implementation challenges identified for practical applications');
      insights.push('Further research needed to address limitations in current approach');
    }
    
    return {
      insights,
      sentiment: Math.random() > 0.5 ? 'positive' : 'neutral',
      confidence: 0.7 + (Math.random() * 0.3)
    };
  } catch (error) {
    console.error('Error generating research insights', error);
    return {
      insights: [
        'Unable to generate detailed insights for this content',
        'Consider reviewing the source material directly'
      ],
      sentiment: 'neutral',
      confidence: 0.5
    };
  }
}

/**
 * Generate a knowledge synthesis from multiple documents
 * @param {string} topic - The synthesis topic
 * @param {Array<Object>} documents - Documents to synthesize
 * @param {string} depth - Synthesis depth (low, medium, high)
 * @returns {Promise<Object>} - Synthesis result
 */
export async function generateKnowledgeSynthesis(topic, documents, depth = 'medium') {
  try {
    console.log('Generating knowledge synthesis', { 
      topic, 
      documentsCount: documents.length, 
      depth 
    });
    
    // In a production environment, this would call a real AI model
    // For demo purposes, we're generating mock synthesis
    
    // Simulate longer processing time based on depth
    const processingTime = depth === 'low' ? 1000 : (depth === 'medium' ? 2000 : 3000);
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    // Build a simple synthesis based on the topic
    let summary, content, keyFindings, insights;
    
    if (topic.toLowerCase().includes('ai') || topic.toLowerCase().includes('machine learning')) {
      summary = "Recent advances in AI and machine learning show promising results across multiple domains, with particular emphasis on large language models and multimodal systems.";
      content = "The synthesis of recent AI research reveals several key trends. First, large language models continue to grow in capability and application scope. Second, multimodal systems integrating vision, text, and audio are demonstrating enhanced reasoning abilities. Third, efforts to reduce computational requirements while maintaining performance are showing promising results.\n\nChallenges remain in several areas: ethical considerations including bias mitigation, evaluation methodology standardization, and deployment in resource-constrained environments. The field is rapidly evolving with significant industrial and academic collaboration.";
      keyFindings = [
        "Large language models demonstrate emergent abilities at scale",
        "Multimodal integration enhances reasoning capabilities",
        "Ethical considerations remain central to deployment strategies",
        "Efficiency improvements reducing computational requirements by 30-40%"
      ];
      insights = [
        "Model alignment techniques significantly impact real-world performance",
        "Domain-specific fine-tuning shows diminishing returns after certain thresholds",
        "Hybrid approaches combining symbolic and neural methods show promise for reasoning tasks"
      ];
    } else if (topic.toLowerCase().includes('security') || topic.toLowerCase().includes('cyber')) {
      summary = "Cybersecurity approaches are evolving rapidly with AI-powered systems showing particular promise for threat detection and mitigation in complex environments.";
      content = "The synthesis of current cybersecurity research highlights the shifting landscape of threats and defenses. AI-powered detection systems are increasingly capable of identifying novel attack patterns, particularly in network traffic analysis and endpoint protection. Zero-trust architecture adoption continues to grow in enterprise environments, with identity verification forming the cornerstone of modern security postures.\n\nThreat actors are demonstrating increasing sophistication, with supply chain attacks and ransomware continuing to pose significant challenges. Critical infrastructure protection remains an area of particular concern, with public-private partnerships emerging as a key strategy for resilience.";
      keyFindings = [
        "AI detection systems reduce alert fatigue by filtering false positives",
        "Zero-trust architecture adoption increasing across sectors",
        "Supply chain attacks represent growing threat vector",
        "Ransomware tactics evolving to target cloud infrastructure"
      ];
      insights = [
        "Behavioral analysis outperforms signature-based detection for novel threats",
        "Secure-by-design principles gaining traction in development practices",
        "Recovery capabilities proving as important as prevention measures"
      ];
    } else {
      summary = `Recent research on ${topic} reveals significant progress and evolving methodologies with potential for practical applications.`;
      content = `The synthesis of current research on ${topic} highlights several important developments. Multiple approaches have been explored with varying degrees of success, with methodology differences significantly impacting outcomes. Implementation challenges remain for practical applications, particularly regarding scalability and integration with existing systems.\n\nStakeholder perspectives vary considerably, with different priorities emerging from academic, industry, and regulatory viewpoints. Future directions for research include addressing current limitations, exploring hybrid approaches, and developing standardized evaluation frameworks.`;
      keyFindings = [
        "Multiple methodologies yield varying success rates",
        "Implementation challenges identified for practical applications",
        "Stakeholder perspectives differ on priorities and approaches",
        "Standardized evaluation frameworks needed for proper comparison"
      ];
      insights = [
        "Combined approaches show more promise than single-methodology solutions",
        "Contextual factors significantly impact implementation success",
        "Future research directions should focus on addressing current limitations"
      ];
    }
    
    // If depth is high, generate a mock knowledge graph
    let graph = null;
    if (depth === 'high' || depth === 'medium') {
      graph = _generateMockKnowledgeGraph(topic, documents);
    }
    
    return {
      topic,
      summary,
      content,
      key_findings: keyFindings,
      insights,
      graph,
      depth,
      document_count: documents.length,
      confidence: 0.7 + (Math.random() * 0.3)
    };
  } catch (error) {
    console.error('Error generating knowledge synthesis', error);
    return {
      topic,
      summary: `Synthesis of ${topic} research.`,
      content: `A review of the available information on ${topic} suggests various perspectives and approaches. The synthesis process encountered challenges in fully integrating the available data.`,
      key_findings: [
        "Multiple perspectives exist on this topic",
        "Further research is needed for comprehensive understanding",
        "Available data shows some inconsistencies"
      ],
      insights: [
        "Consider consulting primary sources for detailed analysis",
        "The field appears to be evolving rapidly"
      ],
      document_count: documents.length,
      confidence: 0.5
    };
  }
}

/**
 * Generate a mock knowledge graph (internal helper function)
 * @private
 */
function _generateMockKnowledgeGraph(topic, documents) {
  // Create mock nodes based on the topic and documents
  const nodes = [
    { id: 'n1', label: topic, type: 'topic', size: 40 }
  ];
  
  // Add concept nodes
  const concepts = [
    'Methodology', 'Applications', 'Challenges', 'Future Directions', 
    'Key Findings', 'Historical Context', 'Evaluation Metrics'
  ];
  
  concepts.forEach((concept, i) => {
    nodes.push({
      id: `c${i+1}`,
      label: concept,
      type: 'concept',
      size: 25
    });
  });
  
  // Add document nodes
  documents.forEach((doc, i) => {
    if (i < 8) { // Limit to 8 document nodes for clarity
      nodes.push({
        id: `d${i+1}`,
        label: doc.title.length > 30 ? doc.title.substring(0, 30) + '...' : doc.title,
        type: 'document',
        size: 15,
        source: doc.source,
        documentId: doc.id
      });
    }
  });
  
  // Create edges
  const edges = [];
  
  // Connect topic to concepts
  concepts.forEach((concept, i) => {
    edges.push({
      source: 'n1',
      target: `c${i+1}`,
      weight: 0.7 + (Math.random() * 0.3)
    });
  });
  
  // Connect documents to concepts
  documents.forEach((doc, i) => {
    if (i < 8) {
      // Each document connects to 1-3 concepts
      const numConnections = 1 + Math.floor(Math.random() * 3);
      const conceptIndices = _getRandomIndices(concepts.length, numConnections);
      
      conceptIndices.forEach(conceptIdx => {
        edges.push({
          source: `d${i+1}`,
          target: `c${conceptIdx+1}`,
          weight: 0.5 + (Math.random() * 0.5)
        });
      });
      
      // Also connect to topic
      edges.push({
        source: `d${i+1}`,
        target: 'n1',
        weight: 0.4 + (Math.random() * 0.3)
      });
    }
  });
  
  // Connect some documents to each other
  if (documents.length > 1) {
    const connections = Math.min(documents.length, 5);
    for (let i = 0; i < connections; i++) {
      const [idx1, idx2] = _getRandomIndices(Math.min(documents.length, 8), 2);
      
      edges.push({
        source: `d${idx1+1}`,
        target: `d${idx2+1}`,
        weight: 0.3 + (Math.random() * 0.4)
      });
    }
  }
  
  return { nodes, edges };
}

/**
 * Helper to get random unique indices
 * @private
 */
function _getRandomIndices(max, count) {
  const indices = [];
  while (indices.length < count && indices.length < max) {
    const idx = Math.floor(Math.random() * max);
    if (!indices.includes(idx)) {
      indices.push(idx);
    }
  }
  return indices;
}

/**
 * Extract research interests from a user's chat history
 * @param {string} chatHistory - Text from user's chat messages
 * @returns {Promise<Array<string>>} - Array of research interests
 */
export async function extractResearchInterests(chatHistory) {
  try {
    const prompt = `
You are a research topic extractor. Analyze the following chat messages from a user and identify their top 5 research interests or topics they'd like to learn more about. 
The topics should be general enough to be useful for research (e.g., "Machine Learning" rather than "TensorFlow installation error").
Do not include specific technical problems or troubleshooting questions.

Format your response as a JSON array of strings, with each string being a research topic or interest area.
Example: ["Machine Learning", "Web Development", "Cybersecurity", "Blockchain", "Cloud Architecture"]

User Chat History:
${chatHistory}

Research Interests:`;

    const model = 'gemini-pro'; // Using Gemini for structured output
    const response = await generateTextWithGemini(prompt, model);
    
    try {
      // Try to parse the response as JSON
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        const interestsArray = JSON.parse(jsonMatch[0]);
        
        // Validate that it's an array of strings
        if (Array.isArray(interestsArray) && interestsArray.every(item => typeof item === 'string')) {
          return interestsArray;
        }
      }
      
      // If not valid JSON array, try to extract lines that look like topics
      const lines = response.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('[') && !line.startsWith(']') && !line.includes(':'))
        .map(line => line.replace(/^["'\d\.\-\s]+/, '').replace(/["',]$/, '').trim());
      
      if (lines.length > 0) {
        return lines.slice(0, 5); // Return up to 5 interests
      }
      
      // If no interests found, return a default interest
      return ['AI & Machine Learning'];
    } catch (parseError) {
      console.error('Error parsing research interests from AI response:', parseError);
      // Extract lines that look like topics
      const lines = response.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.includes(':') && line.length < 50)
        .map(line => line.replace(/^["'\d\.\-\s]+/, '').replace(/["',]$/, '').trim());
      
      return lines.slice(0, 5); // Return up to 5 interests
    }
  } catch (error) {
    console.error('Error extracting research interests:', error);
    return ['AI & Machine Learning']; // Default fallback
  }
} 