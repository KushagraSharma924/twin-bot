import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import dotenv from 'dotenv';

dotenv.config();

// Azure OpenAI client initialization
const azureApiKey = process.env.AZURE_OPENAI_KEY;
const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
const modelName = "gpt-4";

/**
 * Initialize the Azure OpenAI client
 */
function createClient() {
  return ModelClient(
    azureEndpoint,
    new AzureKeyCredential(azureApiKey)
  );
}

/**
 * Process a general chat message
 * @param {string} message - User message
 * @param {Array} history - Chat history
 */
export async function processChat(message, history = []) {
  try {
    const client = createClient();
    
    // Convert history to chat format
    const messages = [
      { role: "system", content: "You are a helpful AI digital twin assistant. You help your user manage their tasks, schedule, and provide insights based on their data." },
      ...history.map(entry => ({
        role: entry.source === 'user' ? 'user' : 'assistant',
        content: entry.message
      })),
      { role: "user", content: message }
    ];
    
    const response = await client.path("/chat/completions").post({
      body: {
        messages,
        max_tokens: 1000,
        model: modelName,
        temperature: 0.7
      }
    });

    if (isUnexpected(response)) {
      throw response.body.error;
    }

    return response.body.choices[0].message.content;
  } catch (error) {
    console.error("Chat processing error:", error);
    throw error;
  }
}

/**
 * Extract tasks from user message or content
 * @param {string} content - Content to extract tasks from
 */
export async function extractTasks(content) {
  try {
    const client = createClient();
    
    const messages = [
      { 
        role: "system", 
        content: `Extract actionable tasks from the following text. 
                  Follow these guidelines:
                  1. Identify clear, actionable items the user needs to complete
                  2. Determine the priority (high, medium, low) based on urgency and importance
                  3. Detect any mentioned deadlines or timeframes
                  4. Estimate a duration in minutes if possible
                  5. Format as a JSON array of task objects with these properties:
                     - task: string (the task description)
                     - priority: string (high, medium, low)
                     - deadline: string (ISO date string if specified, null if not)
                     - estimatedDuration: number (minutes, default 60 if not specified)
                     - description: string (additional details about the task)`
      },
      { role: "user", content }
    ];
    
    const response = await client.path("/chat/completions").post({
      body: {
        messages,
        max_tokens: 1500,
        model: modelName,
        temperature: 0.2
      }
    });

    if (isUnexpected(response)) {
      throw response.body.error;
    }

    const taskText = response.body.choices[0].message.content;
    
    // Extract JSON from the response
    const jsonMatch = taskText.match(/\[.*\]/s) || taskText.match(/\{.*\}/s);
    if (!jsonMatch) {
      throw new Error("Could not extract valid JSON from the response");
    }
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Task extraction error:", error);
    throw error;
  }
}

/**
 * Convert text description to calendar event
 * @param {string} content - Description of the event
 */
export async function createCalendarEvent(content) {
  try {
    const client = createClient();
    
    const messages = [
      { 
        role: "system", 
        content: `Convert the following text into a structured calendar event.
                  Parse the following details if present:
                  1. Event title/summary
                  2. Start date and time
                  3. End date and time (or duration)
                  4. Location
                  5. Description/details
                  6. Attendees
                  
                  Format as a JSON object with these properties:
                  - summary: string (event title)
                  - start: object with dateTime (ISO string) and timeZone
                  - end: object with dateTime (ISO string) and timeZone
                  - location: string (optional)
                  - description: string (optional)
                  - attendees: array of objects with email (optional)
                  
                  Current date/time is ${new Date().toISOString()}.
                  If time is not specified, use 9:00 AM for start time.
                  If date is not specified, use today or next appropriate day.
                  If duration is given instead of end time, calculate the end time.
                  Default duration is 1 hour if not specified.`
      },
      { role: "user", content }
    ];
    
    const response = await client.path("/chat/completions").post({
      body: {
        messages,
        max_tokens: 1000,
        model: modelName,
        temperature: 0.2
      }
    });

    if (isUnexpected(response)) {
      throw response.body.error;
    }

    const eventText = response.body.choices[0].message.content;
    
    // Extract JSON from the response
    const jsonMatch = eventText.match(/\{.*\}/s);
    if (!jsonMatch) {
      throw new Error("Could not extract valid JSON from the response");
    }
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Calendar event creation error:", error);
    throw error;
  }
}

/**
 * Analyze browser history/usage data to provide insights
 * @param {Object} browserData - Browser history and usage data
 */
export async function analyzeBrowserInsights(browserData) {
  try {
    const client = createClient();
    
    const messages = [
      { 
        role: "system", 
        content: `Analyze the provided browser history and usage data to extract meaningful insights.
                  Focus on:
                  1. Identifying patterns in browsing behavior
                  2. Detecting time-consuming websites or distractions
                  3. Recognizing productivity patterns
                  4. Suggesting ways to optimize browsing habits
                  5. Identifying potential tasks or interests based on browsing history
                  
                  Format response as a JSON object with these properties:
                  - insights: array of string observations
                  - productivityScore: number between 0-100
                  - timeWasters: array of string website names
                  - suggestedActions: array of string recommendations
                  - potentialTasks: array of task objects with task and priority properties`
      },
      { role: "user", content: JSON.stringify(browserData) }
    ];
    
    const response = await client.path("/chat/completions").post({
      body: {
        messages,
        max_tokens: 1500,
        model: modelName,
        temperature: 0.3
      }
    });

    if (isUnexpected(response)) {
      throw response.body.error;
    }

    const insightsText = response.body.choices[0].message.content;
    
    // Extract JSON from the response
    const jsonMatch = insightsText.match(/\{.*\}/s);
    if (!jsonMatch) {
      throw new Error("Could not extract valid JSON from the response");
    }
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Browser insights analysis error:", error);
    throw error;
  }
}

/**
 * Generate a summary of user's productivity and tasks
 * @param {Object} userData - User's tasks, calendar, and browser data
 */
export async function generateProductivitySummary(userData) {
  try {
    const client = createClient();
    
    const messages = [
      { 
        role: "system", 
        content: `Generate a comprehensive productivity summary based on the user's data.
                  Include:
                  1. Overall productivity assessment
                  2. Task completion rate and upcoming deadlines
                  3. Time management analysis
                  4. Suggestions for improvement
                  5. Schedule optimization recommendations
                  
                  Format as a JSON object with:
                  - summary: string (overall assessment)
                  - productivityScore: number (0-100)
                  - taskCompletionRate: number (percentage)
                  - keyInsights: array of strings
                  - recommendations: array of strings
                  - focusAreas: array of strings (areas needing improvement)`
      },
      { role: "user", content: JSON.stringify(userData) }
    ];
    
    const response = await client.path("/chat/completions").post({
      body: {
        messages,
        max_tokens: 1500,
        model: modelName,
        temperature: 0.4
      }
    });

    if (isUnexpected(response)) {
      throw response.body.error;
    }

    const summaryText = response.body.choices[0].message.content;
    
    // Extract JSON from the response
    const jsonMatch = summaryText.match(/\{.*\}/s);
    if (!jsonMatch) {
      throw new Error("Could not extract valid JSON from the response");
    }
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Productivity summary generation error:", error);
    throw error;
  }
}

/**
 * Detect user's intent from message
 * @param {string} message - User message
 */
export async function detectIntent(message) {
  try {
    const client = createClient();
    
    const messages = [
      { 
        role: "system", 
        content: `Determine the user's intent from their message.
                  Classify into one of these categories:
                  - task_creation: User wants to create a new task
                  - calendar_event: User wants to schedule an event
                  - task_query: User is asking about existing tasks
                  - calendar_query: User is asking about their schedule
                  - general_chat: General conversation or question
                  - productivity_help: User is asking for productivity advice
                  - browser_insight: User is asking about their browsing habits
                  - other: Any other intent
                  
                  Return a JSON object with:
                  - intent: string (one of the above categories)
                  - confidence: number (0-1)
                  - entities: object with any extracted entities relevant to the intent`
      },
      { role: "user", content: message }
    ];
    
    const response = await client.path("/chat/completions").post({
      body: {
        messages,
        max_tokens: 500,
        model: modelName,
        temperature: 0.2
      }
    });

    if (isUnexpected(response)) {
      throw response.body.error;
    }

    const intentText = response.body.choices[0].message.content;
    
    // Extract JSON from the response
    const jsonMatch = intentText.match(/\{.*\}/s);
    if (!jsonMatch) {
      throw new Error("Could not extract valid JSON from the response");
    }
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Intent detection error:", error);
    throw error;
  }
}

export default {
  processChat,
  extractTasks,
  createCalendarEvent,
  analyzeBrowserInsights,
  generateProductivitySummary,
  detectIntent
}; 