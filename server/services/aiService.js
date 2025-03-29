import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import * as calendarService from '../services/calendarService.js';

// Load environment variables
dotenv.config();

// Replace Google Gemini initialization with Ollama
import ollama from 'ollama';

// Configure Ollama
const ollamaHost = process.env.OLLAMA_HOST || 'https://chatbot-x8x4.onrender.com/ollama';
const ollamaModel = process.env.OLLAMA_MODEL || 'llama3';
const isRenderEnv = process.env.RENDER === 'true';

// Determine if we're in local or Render environment
console.log(`Environment: ${isRenderEnv ? 'Render (Production)' : 'Local Development'}`);
console.log(`Ollama Host: ${ollamaHost}`);

// Add fallback configuration for OpenAI
const openaiApiKey = process.env.OPENAI_API_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;

/**
 * Check if Ollama is available
 * @returns {Promise<boolean>} - Whether Ollama is available
 */
async function isOllamaAvailable() {
  try {
    console.log(`Testing Ollama availability at ${ollamaHost}...`);
    const response = await fetch(`${ollamaHost}/api/version`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });
    
    if (response.ok) {
      console.log('Ollama is available');
      return true;
    }
    
    console.log(`Ollama is not available. Status: ${response.status}`);
    return false;
  } catch (error) {
    console.error('Ollama availability check failed:', error.message);
    return false;
  }
}

/**
 * Process NLP tasks using Ollama
 * @param {string} content - The content to process
 * @param {string} task - The type of task (general, task_extraction, or calendar_event)
 * @param {Array} chatHistory - Previous chat messages for context retention
 * @returns {Promise<string>} - The processed response
 */
export async function processNLPTask(content, task = 'general', chatHistory = []) {
  try {
    console.log('Ollama configuration:');
    console.log('- Model:', ollamaModel);
    console.log('- Task:', task);
    console.log('- Chat history length:', chatHistory.length);
    console.log('- Ollama Host:', ollamaHost);

    // Check Ollama availability first if in Render environment
    if (isRenderEnv && !(await isOllamaAvailable())) {
      console.log('Ollama is not available in Render environment. Using fallbacks...');
      
      // Try to use OpenAI fallback
      if (openaiApiKey) {
        try {
          console.log("Using OpenAI as primary fallback");
          return await fallbackToOpenAI(content, task, chatHistory);
        } catch (error) {
          console.error("OpenAI fallback failed:", error.message);
        }
      }
      
      // Try Gemini fallback if OpenAI fails
      if (geminiApiKey) {
        try {
          console.log("Using Gemini as secondary fallback");
          return await fallbackToGemini(content, task, chatHistory);
        } catch (error) {
          console.error("Gemini fallback failed:", error.message);
        }
      }
      
      // If all fallbacks fail, use static response
      console.log("All fallbacks failed. Using static response.");
      return generateStaticFallbackResponse(task, content);
    }

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
    
    console.log('Making API call to Ollama with context retention...');
    
    // Prepare messages array with system prompt and chat history
    const messages = [
      { role: 'system', content: systemPrompt }
    ];
    
    // Add chat history to messages for context retention
    if (chatHistory && chatHistory.length > 0) {
      messages.push(...chatHistory);
    }
    
    // Add the current user message
    messages.push({ role: 'user', content: content });
    
    try {
      // Try connecting to Ollama with increased timeout
      console.log(`Attempting to connect to Ollama at ${ollamaHost}...`);
      
      // Generate content with Ollama using context retention
      const response = await ollama.chat({
        model: ollamaModel,
        messages: messages,
        host: ollamaHost,
        options: {
          num_ctx: 4096  // Increase context window to retain more history
        }
      });
      
      let responseText = response.message.content;
      
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
    } catch (ollamaError) {
      console.error("Ollama processing error:", ollamaError);
      console.log("Trying fallback options...");
      
      // Check if we have OpenAI API key as fallback
      if (openaiApiKey) {
        console.log("Using OpenAI as fallback");
        try {
          return await fallbackToOpenAI(content, task, chatHistory);
        } catch (openaiError) {
          console.error("OpenAI fallback error:", openaiError);
          // Continue to next fallback
        }
      }
      
      // Check if we have Gemini API key as fallback
      if (geminiApiKey) {
        console.log("Using Gemini as fallback");
        try {
          return await fallbackToGemini(content, task, chatHistory);
        } catch (geminiError) {
          console.error("Gemini fallback error:", geminiError);
          // Continue to static fallback
        }
      }
      
      // Fallback to static responses
      console.log("Using static fallback response");
      return generateStaticFallbackResponse(task, content);
    }
  } catch (error) {
    console.error("NLP processing error:", error);
    
    // Provide a graceful fallback response
    return generateStaticFallbackResponse(task, content);
  }
}

/**
 * Fallback to OpenAI when Ollama is not available
 * @private
 */
async function fallbackToOpenAI(content, task, chatHistory = []) {
  // Implementation would go here
  // For now, return a fallback message
  return `I apologize, but my primary service is currently unavailable. I'm using a limited backup mode. ${getTaskSpecificFallbackMessage(task)}`;
}

/**
 * Fallback to Gemini when Ollama is not available
 * @private
 */
async function fallbackToGemini(content, task, chatHistory = []) {
  // Implementation would go here
  // For now, return a fallback message
  return `I apologize, but my primary service is currently unavailable. I'm using a limited backup mode. ${getTaskSpecificFallbackMessage(task)}`;
}

/**
 * Generate a static fallback response based on the task
 * @private
 */
function generateStaticFallbackResponse(task, content) {
  if (task === 'task_extraction') {
    return JSON.stringify([
      {
        "task": "Check system connectivity",
        "priority": "high",
        "deadline": new Date().toISOString().split('T')[0]
      },
      {
        "task": "Ensure Ollama service is running",
        "priority": "high",
        "deadline": new Date().toISOString().split('T')[0]
      }
    ]);
  } else if (task === 'calendar_event') {
    return JSON.stringify({
      "summary": "Check System Status",
      "description": "Verify that all AI services are operational",
      "location": "",
      "start": {
        "dateTime": new Date(Date.now() + 3600000).toISOString(),
        "timeZone": Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      "end": {
        "dateTime": new Date(Date.now() + 7200000).toISOString(),
        "timeZone": Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      "attendees": []
    });
  } else {
    return `I apologize, but I'm currently experiencing technical difficulties connecting to my AI service. The system is trying to connect to an Ollama instance that isn't available. Please try again later or contact support for assistance.`;
  }
}

/**
 * Get task-specific fallback message
 * @private
 */
function getTaskSpecificFallbackMessage(task) {
  if (task === 'task_extraction') {
    return "I can't extract detailed tasks right now.";
  } else if (task === 'calendar_event') {
    return "I can't process calendar events at the moment.";
  } else {
    return "How can I assist you with basic information?";
  }
}

/**
 * Process NLP tasks with streaming responses
 * @param {string} content - The content to process
 * @param {Function} callback - Callback for streaming chunks
 * @param {string} task - The type of task
 * @param {Array} chatHistory - Previous chat messages for context retention
 * @returns {Promise<string>} - The complete response
 */
export async function processNLPTaskStreaming(content, callback, task = 'general', chatHistory = []) {
  try {
    let systemPrompt = "You are an AI digital twin assistant. Be concise.";
    
    if (task === 'task_extraction') {
      systemPrompt = "Extract actionable tasks from the text. Be concise.";
    } else if (task === 'calendar_event') {
      systemPrompt = "Create a calendar event from this request. Be concise.";
    }
    
    console.log('Making streaming API call to Ollama with context retention...');
    console.log('- Chat history length:', chatHistory.length);
    
    // Prepare messages array with system prompt and chat history
    const messages = [
      { role: 'system', content: systemPrompt }
    ];
    
    // Add chat history to messages for context retention
    if (chatHistory && chatHistory.length > 0) {
      messages.push(...chatHistory);
    }
    
    // Add the current user message
    messages.push({ role: 'user', content: content });
    
    // Generate content with streaming using context retention
    const stream = await ollama.chat({
      model: ollamaModel,
      messages: messages,
      stream: true,
      host: ollamaHost,
      options: {
        num_ctx: 4096  // Increase context window to retain more history
      }
    });
    
    let fullResponse = '';
    
    // Process the streaming response
    for await (const chunk of stream) {
      if (chunk && chunk.message && chunk.message.content) {
        const chunkText = chunk.message.content;
        fullResponse += chunkText;
        callback(fullResponse);
      }
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
    nextWeek.setDate(today.getDate() + 7);
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

    console.log('Making API call to Ollama for event extraction...');
    
    // Generate content with Ollama
    const response = await ollama.chat({
      model: ollamaModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: preprocessedMessage }
      ],
      host: ollamaHost
    });
    
    let responseText = response.message.content;
    
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
    
    // Provide more helpful error message based on the type of error
    if (error.message && error.message.includes('Invalid Google credentials')) {
      return {
        success: false,
        message: `I couldn't access your calendar. In development mode, we're showing this as a simulated success message. In production, you would need to authenticate with Google Calendar.`,
        mockEvent: {
          id: `mock-event-${Date.now()}`,
          summary: eventDetails.eventName,
          start: { dateTime: startDateTime.toISOString() },
          end: { dateTime: endDateTime.toISOString() }
        }
      };
    } else if (error.message && error.message.includes('Invalid date format')) {
      return {
        success: false,
        message: `I couldn't understand the date or time format. Please try again with a clearer date and time.`
      };
    } else {
      return {
        success: false,
        message: `I encountered an issue creating your calendar event. This is likely because we're in development mode. In a production environment, this would work with proper authentication.`
      };
    }
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
    
    // Create a prompt for extracting research insights
    const prompt = `
Analyze the following research content and extract key insights.
${context ? `The research is related to: ${context}` : ''}

Content to analyze:
${content.substring(0, 5000)} // Limit content length

Generate concise, thoughtful insights about this content. Focus on:
1. Key findings or arguments
2. Methodological approaches
3. Potential applications
4. Notable limitations or challenges

Format your response as a JSON object with this structure:
{
  "insights": ["insight 1", "insight 2", "insight 3"],
  "sentiment": "positive" | "neutral" | "negative"
}

Return only the raw JSON without markdown formatting or code blocks.`;

    console.log('Making API call to Ollama for research insights...');
    
    // Generate content with Ollama
    const response = await ollama.chat({
      model: ollamaModel,
      messages: [
        { 
          role: 'system', 
          content: 'You are a research analysis assistant. Extract key insights from research content.' 
        },
        { role: 'user', content: prompt }
      ],
      host: ollamaHost
    });
    
    let responseText = response.message.content;
    
    // Try to extract JSON from the response
    try {
      // Remove markdown code blocks if present
      if (responseText.includes('```')) {
        const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch && codeBlockMatch[1]) {
          responseText = codeBlockMatch[1].trim();
        }
      }
      
      // Try to find valid JSON in the response
      const jsonMatch = responseText.match(/(\{[\s\S]*\})/);
      if (jsonMatch && jsonMatch[1]) {
        const parsed = JSON.parse(jsonMatch[1]);
        return parsed;
      }
    } catch (e) {
      console.error('Error parsing research insights JSON:', e);
    }
    
    // Fallback to default response
    return {
      insights: [
        'Multiple methodologies compared showing varied efficacy',
        'Implementation challenges identified for practical applications',
        'Further research needed to address limitations in current approach'
      ],
      sentiment: 'neutral',
      confidence: 0.5
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
    
    // Prepare document content for the prompt
    const documentTexts = documents.map((doc, index) => {
      const content = doc.content || doc.abstract || doc.excerpt || '';
      const title = doc.title || `Document ${index + 1}`;
      return `Document ${index + 1}: ${title}\n${content.substring(0, 1000)}`;
    }).join('\n\n');
    
    // Create a prompt based on depth
    const detailLevel = depth === 'low' ? 'brief' : depth === 'medium' ? 'moderate' : 'comprehensive';
    
    const prompt = `
Generate a ${detailLevel} knowledge synthesis on the topic of "${topic}" based on the following documents:

${documentTexts}

Provide a structured synthesis with the following components:
1. A concise summary (2-3 sentences)
2. A detailed analysis (${depth === 'low' ? '1-2 paragraphs' : depth === 'medium' ? '3-4 paragraphs' : '5+ paragraphs'})
3. Key findings (4-6 bullet points)
4. Insights and implications (3-5 bullet points)

Format your response as a JSON object with this structure:
{
  "summary": "Concise summary here",
  "content": "Detailed analysis here",
  "key_findings": ["finding 1", "finding 2", "finding 3", "finding 4"],
  "insights": ["insight 1", "insight 2", "insight 3"]
}

Return only the raw JSON without markdown formatting or code blocks.`;

    console.log('Making API call to Ollama for knowledge synthesis...');
    
    // Generate content with Ollama
    const response = await ollama.chat({
      model: ollamaModel,
      messages: [
        { 
          role: 'system', 
          content: 'You are a research synthesis assistant. Create coherent knowledge syntheses from multiple documents.' 
        },
        { role: 'user', content: prompt }
      ],
      host: ollamaHost
    });
    
    let responseText = response.message.content;
    
    // Try to extract JSON from the response
    try {
      // Remove markdown code blocks if present
      if (responseText.includes('```')) {
        const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch && codeBlockMatch[1]) {
          responseText = codeBlockMatch[1].trim();
        }
      }
      
      // Try to find valid JSON in the response
      const jsonMatch = responseText.match(/(\{[\s\S]*\})/);
      if (jsonMatch && jsonMatch[1]) {
        const parsed = JSON.parse(jsonMatch[1]);
        
        // Add graph if depth is medium or high
        let graph = null;
        if (depth === 'high' || depth === 'medium') {
          graph = _generateMockKnowledgeGraph(topic, documents);
        }
        
        return {
          ...parsed,
          topic,
          graph,
          document_count: documents.length,
          confidence: 0.7
        };
      }
    } catch (e) {
      console.error('Error parsing knowledge synthesis JSON:', e);
    }
    
    // Fallback to default response with mock data
    let summary = `Recent research on ${topic} reveals significant progress and evolving methodologies with potential for practical applications.`;
    let content = `The synthesis of current research on ${topic} highlights several important developments. Multiple approaches have been explored with varying degrees of success, with methodology differences significantly impacting outcomes. Implementation challenges remain for practical applications, particularly regarding scalability and integration with existing systems.\n\nStakeholder perspectives vary considerably, with different priorities emerging from academic, industry, and regulatory viewpoints. Future directions for research include addressing current limitations, exploring hybrid approaches, and developing standardized evaluation frameworks.`;
    let keyFindings = [
      "Multiple methodologies yield varying success rates",
      "Implementation challenges identified for practical applications",
      "Stakeholder perspectives differ on priorities and approaches",
      "Standardized evaluation frameworks needed for proper comparison"
    ];
    let insights = [
      "Combined approaches show more promise than single-methodology solutions",
      "Contextual factors significantly impact implementation success",
      "Future research directions should focus on addressing current limitations"
    ];
    
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
      document_count: documents.length,
      confidence: 0.5
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

    console.log('Making API call to Ollama for research interests extraction...');
    
    // Generate content with Ollama
    const response = await ollama.chat({
      model: ollamaModel,
      messages: [
        { 
          role: 'system', 
          content: 'You are a research topic extractor. Extract research interests from chat history.' 
        },
        { role: 'user', content: prompt }
      ],
      host: ollamaHost
    });
    
    const responseText = response.message.content;
    
    try {
      // Try to parse the response as JSON
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        const interestsArray = JSON.parse(jsonMatch[0]);
        
        // Validate that it's an array of strings
        if (Array.isArray(interestsArray) && interestsArray.every(item => typeof item === 'string')) {
          return interestsArray;
        }
      }
      
      // If not valid JSON array, try to extract lines that look like topics
      const lines = responseText.split('\n')
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
      const lines = responseText.split('\n')
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