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
 * Extract event details specifically for calendar integration
 * @param {string} userMessage - The user's message about the event
 * @returns {Promise<Object>} - Parsed event details (eventName, eventDate, eventTime)
 */
export async function extractEventDetails(userMessage) {
  try {
    console.log('Extracting event details from:', userMessage);
    
    // Create a more specific system prompt for calendar event extraction
    const systemPrompt = `Extract the event name, date (YYYY-MM-DD), and time (HH:MM) from the following text. 
Return ONLY the raw JSON with this exact format: 
{
  "eventName": "The name of the event", 
  "eventDate": "YYYY-MM-DD", 
  "eventTime": "HH:MM",
  "location": "Location if mentioned, otherwise empty string"
}

If a date is not explicitly mentioned, use today's date.
If a time is not mentioned, use "09:00" as the default time.
If the text mentions relative dates like "tomorrow" or "next Monday", convert them to the appropriate YYYY-MM-DD format.`;

    // Get the Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Generate content with the model
    const result = await model.generateContent([
      systemPrompt,
      userMessage
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
        console.log('Extracted event details:', parsed);
        return parsed;
      }
    } catch (e) {
      console.error('Error parsing extracted event JSON:', e);
    }
    
    // Try to parse the whole response as JSON
    try {
      const eventDetails = JSON.parse(responseText);
      console.log('Extracted event details:', eventDetails);
      return eventDetails;
    } catch (parseError) {
      console.error('Could not parse event details:', parseError);
      throw new Error('Could not extract event details from the message');
    }
  } catch (error) {
    console.error('Error extracting event details:', error);
    throw error;
  }
}

/**
 * Create calendar event from extracted details
 * @param {Object} eventDetails - The extracted event details
 * @param {string} accessToken - Google access token
 * @returns {Promise<Object>} - Created event details
 */
export async function addEventToCalendar(eventDetails, accessToken) {
  try {
    console.log('Adding event to calendar with details:', JSON.stringify(eventDetails));
    
    if (!eventDetails.eventName || !eventDetails.eventDate || !eventDetails.eventTime) {
      throw new Error('Missing required event information');
    }
    
    // Convert to Google Calendar format
    const startDateTime = new Date(`${eventDetails.eventDate}T${eventDetails.eventTime}:00`);
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1-hour event
    
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
    console.log('Using access token (first 10 chars):', accessToken.substring(0, 10) + '...');
    
    // Use the calendarService to create the event
    const result = await calendarService.createCalendarEvent(
      { access_token: accessToken },
      event
    );
    
    console.log('Calendar event creation result:', result ? 'Success' : 'Failed');
    if (result && result.data) {
      console.log('Created event with ID:', result.data.id);
    }
    
    return {
      success: true,
      event: result.data,
      message: `Event "${eventDetails.eventName}" added to your calendar on ${eventDetails.eventDate} at ${eventDetails.eventTime}`
    };
  } catch (error) {
    console.error('Error adding event to calendar:', error);
    throw error;
  }
} 