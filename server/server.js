import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as auth from './auth.js';
import * as aiApi from './ai-api.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware
app.use(cors());
app.use(express.json());

// Apply auth middleware to all protected routes
app.use('/api/twin', auth.authMiddleware);
app.use('/api/calendar', auth.authMiddleware);
app.use('/api/browser', auth.authMiddleware);
app.use('/api/user', auth.authMiddleware);

// Admin routes with stricter authorization
app.use('/api/admin', auth.adminMiddleware);

// Supabase client initialization
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Google OAuth2 client with proper credentials
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Helper function for NLP processing using Google Gemini
async function processNLPTask(content, task = 'general') {
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

// Streaming version for real-time responses
async function processNLPTaskStreaming(content, callback, task = 'general') {
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

// ===== API ROUTES =====

// Authentication routes
app.post('/api/auth/login', auth.login);
app.post('/api/auth/register', auth.register);
app.post('/api/auth/resend-verification', auth.resendVerification);
app.post('/api/auth/verification-status', auth.checkVerificationStatus);
app.post('/api/auth/reset-password', auth.resetPassword);
app.post('/api/auth/update-password', auth.updatePassword);

// User profile routes
app.get('/api/user/profile', auth.getProfile);
app.post('/api/user/create-profile', auth.createProfile);

// Digital Twin API
app.post('/api/twin/chat', async (req, res) => {
  try {
    // Use the authenticated user from middleware if available
    const userId = req.user?.id || req.body.userId;
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const { message } = req.body;
    
    // Store the conversation in Supabase
    const { error: conversationError } = await supabase
      .from('conversations')
      .insert([{
        user_id: userId,
        message,
        timestamp: new Date(),
        source: 'user'
      }]);
    
    if (conversationError) throw conversationError;
    
    // Process message with Gemini NLP
    const response = await aiApi.processNLPTask(message);
    
    // Store the AI response
    const { error: responseError } = await supabase
      .from('conversations')
      .insert([{
        user_id: userId,
        message: response,
        timestamp: new Date(),
        source: 'assistant'
      }]);
    
    if (responseError) throw responseError;
    
    res.json({ response });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Task extraction and management
app.post('/api/twin/extract-tasks', async (req, res) => {
  try {
    const { content, userId } = req.body;
    
    // Extract tasks using NLP
    const tasksJson = await aiApi.processNLPTask(content, 'task_extraction');
    
    // Parse JSON with error handling
    let tasks;
    try {
      tasks = JSON.parse(tasksJson);
    } catch (parseError) {
      console.error("JSON parsing error:", parseError);
      console.error("Received tasksJson:", tasksJson);
      return res.status(400).json({ 
        error: "Failed to parse tasks", 
        message: "The AI returned invalid JSON. Please try again with simpler text.",
        details: parseError.message,
        rawResponse: tasksJson
      });
    }
    
    // Ensure we got an array
    if (!Array.isArray(tasks)) {
      return res.status(400).json({
        error: "Invalid task format",
        message: "The AI did not return an array of tasks. Please try again.",
        receivedValue: tasks
      });
    }
    
    // Convert date strings to proper ISO dates
    const processedTasks = tasks.map(task => {
      const processedTask = { ...task };
      
      // Handle deadline field if it exists
      if (task.deadline) {
        try {
          // Try to convert relative dates like "Friday" to actual dates
          if (/^(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i.test(task.deadline)) {
            const today = new Date();
            let daysToAdd = 0;
            
            const dayLower = task.deadline.toLowerCase();
            if (dayLower === 'today') {
              daysToAdd = 0;
            } else if (dayLower === 'tomorrow') {
              daysToAdd = 1;
            } else {
              // Calculate days to add based on day of week
              const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
                .indexOf(dayLower);
              if (dayOfWeek !== -1) {
                const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
                daysToAdd = (dayOfWeek + 7 - currentDay) % 7;
                if (daysToAdd === 0) daysToAdd = 7; // Next week if today
              }
            }
            
            const deadlineDate = new Date(today);
            deadlineDate.setDate(today.getDate() + daysToAdd);
            processedTask.deadline = deadlineDate.toISOString();
          } else {
            // Try to parse as a date
            const parsedDate = new Date(task.deadline);
            if (!isNaN(parsedDate.getTime())) {
              processedTask.deadline = parsedDate.toISOString();
            } else {
              // If we can't parse it, store as a string in a different field and use today's date
              processedTask.deadline_text = task.deadline;
              processedTask.deadline = new Date().toISOString();
            }
          }
        } catch (error) {
          console.warn(`Failed to parse deadline: ${task.deadline}`, error);
          // Store original as text and use current date as fallback
          processedTask.deadline_text = task.deadline;
          processedTask.deadline = new Date().toISOString();
        }
      } else {
        // Default to 7 days from now if no deadline provided
        const defaultDeadline = new Date();
        defaultDeadline.setDate(defaultDeadline.getDate() + 7);
        processedTask.deadline = defaultDeadline.toISOString();
      }
      
      return processedTask;
    });
    
    // Store tasks in Supabase
    const { error } = await supabase
      .from('tasks')
      .insert(processedTasks.map(task => ({
        ...task,
        user_id: userId,
        created_at: new Date(),
        status: 'pending'
      })));
    
    if (error) throw error;
    
    res.json({ tasks: processedTasks });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Google Calendar integration
app.post('/api/calendar/create-event', async (req, res) => {
  try {
    let eventDetails = req.body.eventDetails;
    const { accessToken, userId, content } = req.body;
    
    if (!accessToken) {
      return res.status(400).json({ error: "Access token is required" });
    }
    
    // If we need to extract the event details from text
    if (content && !eventDetails) {
      try {
        const eventJson = await aiApi.processNLPTask(content, 'calendar_event');
        
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
          
          if (eventDetails.end && typeof eventDetails.end === 'string') {
            // If end is a string instead of an object with dateTime
            const endDate = new Date(eventDetails.end);
            if (!isNaN(endDate.getTime())) {
              eventDetails.end = { 
                dateTime: endDate.toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
              };
            }
          } else if (eventDetails.end && !eventDetails.end.dateTime) {
            // If end doesn't have dateTime property
            const endDate = new Date();
            // Default to 2 hours from now if no time specified
            endDate.setHours(endDate.getHours() + 2);
            eventDetails.end = { 
              dateTime: endDate.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            };
          } else if (!eventDetails.end && eventDetails.start) {
            // If no end time, default to 1 hour after start
            const endDate = new Date(eventDetails.start.dateTime);
            endDate.setHours(endDate.getHours() + 1);
            eventDetails.end = { 
              dateTime: endDate.toISOString(),
              timeZone: eventDetails.start.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
            };
          } else if (eventDetails.end && eventDetails.end.dateTime && !eventDetails.end.timeZone) {
            // If end has dateTime but no timeZone
            eventDetails.end.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          }
          
          // Ensure we have at least summary
          if (!eventDetails.summary) {
            eventDetails.summary = "New Event"; 
          }
          
        } catch (parseError) {
          console.error("JSON parsing error:", parseError);
          console.error("Received eventJson:", eventJson);
          return res.status(400).json({ 
            error: "Failed to parse event details", 
            message: "The AI returned invalid JSON. Please try again with simpler text.",
            details: parseError.message,
            rawResponse: eventJson
          });
        }
      } catch (nlpError) {
        return res.status(400).json({ 
          error: "Failed to extract event details", 
          message: "Could not extract event details from the provided content.",
          details: nlpError.message
        });
      }
    } else if (eventDetails) {
      // Handle direct event details that may be missing time zone info
      if (eventDetails.start && eventDetails.start.dateTime && !eventDetails.start.timeZone) {
        eventDetails.start.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      }
      
      if (eventDetails.end && eventDetails.end.dateTime && !eventDetails.end.timeZone) {
        eventDetails.end.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      }
    }
    
    // Set credentials for this request
    oauth2Client.setCredentials({ 
      access_token: accessToken,
      // If you have refresh token, include it too for better token management
      // refresh_token: req.body.refreshToken
    });
    
    // Create a new calendar instance with the properly configured auth client
    const calendarInstance = google.calendar({ 
      version: 'v3',
      auth: oauth2Client
    });
    
    console.log('Creating calendar event with the following details:', JSON.stringify(eventDetails, null, 2));
    
    // Create the event using the properly authenticated instance
    const event = await calendarInstance.events.insert({
      calendarId: 'primary',
      resource: eventDetails
    });
    
    // Store reference in Supabase
    const { error } = await supabase
      .from('calendar_events')
      .insert([{
        user_id: userId,
        event_id: event.data.id,
        summary: eventDetails.summary,
        created_at: new Date()
      }]);
    
    if (error) throw error;
    
    res.json({ event: event.data });
  } catch (error) {
    console.error('Calendar event creation error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Add Google OAuth callback endpoint for handling the redirect
app.get('/api/auth/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).send('Authorization code is required');
    }
    
    // Exchange the authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    // Store tokens securely (in this example, we'll just redirect with access token)
    // In a real application, you'd associate these tokens with the user's account
    // tokens contains access_token, refresh_token, id_token, etc.
    
    // Redirect to frontend with access token
    res.redirect(`${process.env.SITE_URL || 'http://localhost:3000'}/auth-success?access_token=${tokens.access_token}`);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.status(500).send('Authentication failed');
  }
});

// Add an endpoint to get Google OAuth URL
app.get('/api/auth/google/url', (req, res) => {
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ];
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // 'offline' gets you a refresh token
    scope: scopes,
    prompt: 'consent'
  });
  
  res.json({ url: authUrl });
});

// Chrome extension data processing
app.post('/api/browser/insights', async (req, res) => {
  try {
    const { browserId, userId, insights } = req.body;
    
    // Store browser insights
    const { error } = await supabase
      .from('browser_insights')
      .insert([{
        user_id: userId,
        browser_id: browserId,
        insights,
        timestamp: new Date()
      }]);
    
    if (error) throw error;
    
    res.json({ status: 'success' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// User preferences
app.post('/api/user/preferences', async (req, res) => {
  try {
    const { userId, preferences } = req.body;
    
    // Update user preferences
    const { error } = await supabase
      .from('user_preferences')
      .upsert([{
        user_id: userId,
        preferences,
        updated_at: new Date()
      }]);
    
    if (error) throw error;
    
    res.json({ status: 'success' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Twin learning endpoint
app.post('/api/twin/learn', async (req, res) => {
  try {
    const { userId, feedback, interaction } = req.body;
    
    // Store learning data for reinforcement learning
    const { error } = await supabase
      .from('learning_data')
      .insert([{
        user_id: userId,
        interaction,
        feedback,
        timestamp: new Date()
      }]);
    
    if (error) throw error;
    
    res.json({ status: 'success' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});