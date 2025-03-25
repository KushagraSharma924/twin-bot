import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

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
- 'start': object - With 'dateTime' in ISO format (YYYY-MM-DDTHH:MM:SS) and 'timeZone' property (e.g., "America/New_York")
- 'end': object - With 'dateTime' in ISO format (YYYY-MM-DDTHH:MM:SS) and 'timeZone' property (e.g., "America/New_York")
- 'attendees': array - List of objects with 'email' property
Use "America/New_York" as the default timeZone if none is specified.
Return only the raw JSON without markdown formatting or code blocks.`;
    }
    
    console.log('Making API call to Gemini...');
    
    // Get the Gemini Pro model
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
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