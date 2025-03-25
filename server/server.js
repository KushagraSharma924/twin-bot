import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as auth from './auth.js';
import * as aiApi from './ai-api.js';
import * as emailService from './services/emailService.js';

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

// Modified email middleware to exclude OAuth callback from authentication
app.use('/api/email', (req, res, next) => {
  // Skip authentication for the OAuth callback route
  if (req.path.startsWith('/oauth2/callback')) {
    return next();
  }
  // Apply auth middleware to all other email routes
  return auth.authMiddleware(req, res, next);
});

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

// Add this function right after Supabase initialization
// This ensures the necessary tables exist
async function ensureOAuthTablesExist() {
  try {
    console.log('Checking if OAuth tables exist...');
    
    // First, verify the oauth_states table
    const { error: checkStatesError } = await supabase
      .from('oauth_states')
      .select('id')
      .limit(1);
    
    if (checkStatesError && checkStatesError.code === '42P01') { // PostgreSQL error for undefined table
      console.log('Creating oauth_states table...');
      // Create oauth_states table if it doesn't exist
      const createStateTableSQL = `
        CREATE TABLE IF NOT EXISTS public.oauth_states (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL,
          state TEXT NOT NULL,
          provider TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          CONSTRAINT oauth_states_state_key UNIQUE (state)
        );
      `;
      
      const { error: createError } = await supabase.rpc('exec', { query: createStateTableSQL });
      if (createError) {
        console.error('Error creating oauth_states table:', createError);
      } else {
        console.log('oauth_states table created successfully');
      }
    } else {
      console.log('oauth_states table exists');
    }
    
    // Verify the email_oauth_tokens table
    const { error: checkTokensError } = await supabase
      .from('email_oauth_tokens')
      .select('id')
      .limit(1);
    
    if (checkTokensError && checkTokensError.code === '42P01') {
      console.log('Creating email_oauth_tokens table...');
      // Create email_oauth_tokens table if it doesn't exist
      const createTokensTableSQL = `
        CREATE TABLE IF NOT EXISTS public.email_oauth_tokens (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL,
          provider TEXT NOT NULL,
          access_token TEXT NOT NULL,
          refresh_token TEXT,
          expires_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          CONSTRAINT email_oauth_tokens_user_id_provider_key UNIQUE (user_id, provider)
        );
      `;
      
      const { error: createError } = await supabase.rpc('exec', { query: createTokensTableSQL });
      if (createError) {
        console.error('Error creating email_oauth_tokens table:', createError);
      } else {
        console.log('email_oauth_tokens table created successfully');
      }
    } else {
      console.log('email_oauth_tokens table exists');
    }
    
    // Verify the email_configurations table
    const { error: checkConfigError } = await supabase
      .from('email_configurations')
      .select('id')
      .limit(1);
    
    if (checkConfigError && checkConfigError.code === '42P01') {
      console.log('Creating email_configurations table...');
      // Create email_configurations table if it doesn't exist
      const createConfigTableSQL = `
        CREATE TABLE IF NOT EXISTS public.email_configurations (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL,
          host TEXT NOT NULL,
          port INTEGER NOT NULL DEFAULT 993,
          secure BOOLEAN NOT NULL DEFAULT TRUE,
          provider TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          CONSTRAINT email_configurations_user_id_key UNIQUE (user_id)
        );
      `;
      
      const { error: createError } = await supabase.rpc('exec', { query: createConfigTableSQL });
      if (createError) {
        console.error('Error creating email_configurations table:', createError);
      } else {
        console.log('email_configurations table created successfully');
      }
    } else {
      console.log('email_configurations table exists');
    }
    
    // Verify the email_metadata table
    const { error: checkMetadataError } = await supabase
      .from('email_metadata')
      .select('id')
      .limit(1);
    
    if (checkMetadataError && checkMetadataError.code === '42P01') {
      console.log('Creating email_metadata table...');
      // Create email_metadata table if it doesn't exist
      const createMetadataTableSQL = `
        CREATE TABLE IF NOT EXISTS public.email_metadata (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL,
          message_id TEXT NOT NULL,
          subject TEXT,
          from TEXT,
          received_date TIMESTAMP WITH TIME ZONE,
          has_attachments BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          -- Add a unique constraint to prevent duplicates
          CONSTRAINT email_metadata_message_id_user_id_key UNIQUE (message_id, user_id)
        );
        
        -- Add indexes for faster queries
        CREATE INDEX IF NOT EXISTS email_metadata_user_id_idx ON public.email_metadata(user_id);
        CREATE INDEX IF NOT EXISTS email_metadata_received_date_idx ON public.email_metadata(received_date);
      `;
      
      const { error: createError } = await supabase.rpc('exec', { query: createMetadataTableSQL });
      if (createError) {
        console.error('Error creating email_metadata table:', createError);
      } else {
        console.log('email_metadata table created successfully');
      }
    } else {
      console.log('email_metadata table exists');
    }
    
  } catch (error) {
    console.error('Error ensuring OAuth tables exist:', error);
  }
}

// Call this after initialization
ensureOAuthTablesExist();

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

// Email API Routes
/* Comment out this route as it conflicts with the auth protected route below
app.post('/api/email/fetch', async (req, res) => {
  try {
    const userId = req.user.id;
    const { credentials, options } = req.body;

    if (!credentials || !credentials.host || !credentials.user || !credentials.password) {
      return res.status(400).json({ error: 'Email credentials are required' });
    }

    // Fetch emails using the email service
    const emails = await emailService.fetchEmails(credentials, options);

    // Store email metadata in Supabase for the user if needed
    // This is optional and depends on application requirements
    if (req.body.saveMetadata) {
      const emailMetadata = emails.map(email => ({
        user_id: userId,
        message_id: email.messageId,
        subject: email.subject,
        from: email.from,
        received_date: email.receivedDate,
        has_attachments: email.attachments.length > 0
      }));

      const { error } = await supabase
        .from('email_metadata')
        .upsert(emailMetadata, { onConflict: 'message_id' });

      if (error) console.error('Error saving email metadata:', error);
    }

    res.json({ emails });
  } catch (error) {
    console.error('Error fetching emails:', error);
    res.status(500).json({ error: error.message });
  }
});
*/

app.post('/api/email/mailboxes', async (req, res) => {
  try {
    const { credentials } = req.body;

    if (!credentials || !credentials.host || !credentials.user || !credentials.password) {
      return res.status(400).json({ error: 'Email credentials are required' });
    }

    // Get mailboxes
    const mailboxes = await emailService.listMailboxes(credentials);
    res.json({ mailboxes });
  } catch (error) {
    console.error('Error listing mailboxes:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/email/mark-read', async (req, res) => {
  try {
    const { credentials, mailbox, uid } = req.body;

    if (!credentials || !mailbox || !uid) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Mark email as read
    await emailService.markAsRead(credentials, mailbox, uid);
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking email as read:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/email/move', async (req, res) => {
  try {
    const { credentials, sourceMailbox, targetMailbox, uid } = req.body;

    if (!credentials || !sourceMailbox || !targetMailbox || !uid) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Move email
    await emailService.moveEmail(credentials, sourceMailbox, targetMailbox, uid);
    res.json({ success: true });
  } catch (error) {
    console.error('Error moving email:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/email/stats', async (req, res) => {
  try {
    const { credentials, mailbox } = req.body;

    if (!credentials) {
      return res.status(400).json({ error: 'Email credentials are required' });
    }

    // Get mailbox stats
    const stats = await emailService.getMailboxStats(credentials, mailbox);
    res.json({ stats });
  } catch (error) {
    console.error('Error getting mailbox stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Email OAuth2 Authentication Routes
app.get('/api/email/oauth2/authorize', auth.authMiddleware, async (req, res) => {
  try {
    const { provider } = req.query;
    const userId = req.user.id;
    
    if (!provider) {
      return res.status(400).json({ error: 'Email provider is required' });
    }
    
    console.log(`OAuth authorization initiated for user ${userId} with provider ${provider}`);
    
    // Generate redirect URI
    const redirectUri = `${process.env.SERVER_URL || 'http://localhost:5002'}/api/email/oauth2/callback`;
    
    // Get authorization URL for the provider
    const authConfig = emailService.getOAuth2AuthUrl(provider, redirectUri);
    
    // Store the state and user info in the session or database to verify later
    console.log(`Storing OAuth state: ${authConfig.state} for user: ${userId}`);
    
    // Check if there's an existing state for this user and provider
    const { data: existingStates, error: checkError } = await supabase
      .from('oauth_states')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', provider);
    
    if (checkError) {
      console.error('Error checking existing states:', checkError);
    } else if (existingStates && existingStates.length > 0) {
      // Clean up existing states for this user and provider
      console.log(`Cleaning up ${existingStates.length} existing state records`);
      await supabase
        .from('oauth_states')
        .delete()
        .eq('user_id', userId)
        .eq('provider', provider);
    }
    
    // Insert the new state
    const { error } = await supabase
      .from('oauth_states')
      .insert([{
        user_id: userId,
        state: authConfig.state,
        provider,
        created_at: new Date()
      }]);
    
    if (error) {
      console.error('Error storing OAuth state:', error);
      throw error;
    }
    
    console.log(`OAuth state stored successfully, redirecting to: ${authConfig.url}`);
    
    // Redirect user to the provider's OAuth page
    res.json({ authUrl: authConfig.url });
  } catch (error) {
    console.error('Email OAuth2 authorization error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/email/oauth2/callback', async (req, res) => {
  try {
    const { code, state, provider } = req.query;
    
    console.log(`OAuth callback received with state: ${state}, provider: ${provider || 'not specified'}`);
    
    if (!code) {
      console.error('Missing code parameter');
      return res.status(400).send('Authorization code is required');
    }
    
    // Initialize variables
    let userId = null;
    let providerName = provider || 'gmail'; // Default to gmail if not specified
    
    // Try to find state in database, but don't fail if not found
    if (state) {
      console.log(`Looking up state: ${state} in database`);
      
      try {
        const { data: stateData, error: stateError } = await supabase
          .from('oauth_states')
          .select('*')
          .eq('state', state)
          .maybeSingle(); // Use maybeSingle instead of single to avoid error
        
        if (stateError) {
          console.warn('Error retrieving state data:', stateError);
        } else if (stateData) {
          console.log(`State found for user: ${stateData.user_id}, provider: ${stateData.provider}`);
          userId = stateData.user_id;
          providerName = stateData.provider;
          
          // Clean up the used state
          await supabase
            .from('oauth_states')
            .delete()
            .eq('state', state);
          
          console.log('State record deleted');
        } else {
          console.warn('No state data found in database');
        }
      } catch (lookupError) {
        console.error('Error during state lookup:', lookupError);
      }
    }
    
    // If we couldn't find a user from state, we need a fallback
    if (!userId) {
      console.log('No valid state found, attempting to find a valid user');
      
      // Try to find a valid user from auth.users table first
      try {
        const { data: authUser, error: authError } = await supabase.auth.getUser();
        
        if (!authError && authUser && authUser.user && authUser.user.email) {
          console.log('Found email from auth user:', authUser.user.email);
          userId = authUser.user.id;
        } else {
          console.error('Could not retrieve email from auth user:', authError || 'No email found');
        }
      } catch (authErr) {
        console.error('Error accessing auth user:', authErr);
      }
      
      // If we couldn't get users from auth, try the public users table
      if (!userId) {
        try {
          // Try to directly query the users table
          const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id')
            .limit(1);
          
          if (usersError) {
            console.error('Error getting user from users table:', usersError);
          } else if (users && users.length > 0) {
            userId = users[0].id;
            console.log(`Using user from users table: ${userId}`);
          }
        } catch (usersError) {
          console.error('Error querying users table:', usersError);
        }
      }
      
      // If we still don't have a valid user, we need to create one or exit
      if (!userId) {
        console.error('No valid user found and cannot proceed without one due to foreign key constraints');
        return res.status(500).send('Authentication failed: No valid user found to associate with the OAuth tokens. Please sign in first.');
      }
    }
    
    // Generate redirect URI (must be the same as in the authorize request)
    const redirectUri = `${process.env.SERVER_URL || 'http://localhost:5002'}/api/email/oauth2/callback`;
    
    // Exchange the code for tokens
    console.log(`Exchanging code for tokens with provider: ${providerName}`);
    const tokens = await emailService.getOAuth2Tokens(providerName, code, redirectUri);
    console.log('Tokens received successfully');
    
    // Store tokens in the database
    const { error } = await supabase
      .from('email_oauth_tokens')
      .upsert([{
        user_id: userId,
        provider: providerName,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_at: new Date(tokens.expiresAt).toISOString(),
        updated_at: new Date()
      }], {
        onConflict: 'user_id,provider'
      });
    
    if (error) {
      console.error('Error storing tokens:', error);
      throw error;
    }
    
    console.log('Tokens stored successfully');
    
    // Determine provider-specific email settings
    let emailConfig = {};
    switch (providerName) {
      case 'gmail':
        emailConfig = {
          host: 'imap.gmail.com',
          port: 993,
          secure: true
        };
        break;
      case 'outlook':
        emailConfig = {
          host: 'outlook.office365.com',
          port: 993,
          secure: true
        };
        break;
      case 'yahoo':
        emailConfig = {
          host: 'imap.mail.yahoo.com',
          port: 993,
          secure: true
        };
        break;
    }
    
    // Store the email configuration
    const { error: configError } = await supabase
      .from('email_configurations')
      .upsert([{
        user_id: userId,
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure,
        provider: providerName,
        updated_at: new Date()
      }], {
        onConflict: 'user_id'
      });
    
    if (configError) {
      console.error('Error storing email configuration:', configError);
      throw configError;
    }
    
    console.log('Email configuration stored successfully');
    
    // Redirect to frontend with success message
    const redirectUrl = `${process.env.SITE_URL || 'http://localhost:3000'}/email-connected?provider=${providerName}`;
    console.log(`Redirecting to: ${redirectUrl}`);
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Email OAuth2 callback error:', error);
    res.status(500).send(`Authentication failed: ${error.message}`);
  }
});

// Get user's email configuration and tokens
app.get('/api/email/config', auth.authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get the user's email configuration
    const { data: config, error: configError } = await supabase
      .from('email_configurations')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (configError && configError.code !== 'PGRST116') { // Not found error
      throw configError;
    }
    
    if (!config) {
      return res.json({ configured: false });
    }
    
    // Check if we have OAuth tokens for this configuration
    if (config.provider) {
      const { data: tokens, error: tokensError } = await supabase
        .from('email_oauth_tokens')
        .select('provider, updated_at, expires_at')
        .eq('user_id', userId)
        .eq('provider', config.provider)
        .single();
      
      if (tokensError && tokensError.code !== 'PGRST116') {
        throw tokensError;
      }
      
      res.json({
        configured: true,
        provider: config.provider,
        host: config.host,
        useOAuth: true,
        tokenStatus: tokens ? {
          provider: tokens.provider,
          updated: tokens.updated_at,
          expires: tokens.expires_at,
          isExpired: new Date(tokens.expires_at) < new Date()
        } : null
      });
    } else {
      // Password-based authentication
      res.json({
        configured: true,
        host: config.host,
        port: config.port,
        secure: config.secure,
        useOAuth: false
      });
    }
  } catch (error) {
    console.error('Error fetching email configuration:', error);
    res.status(500).json({ error: error.message });
  }
});

// Modified fetch emails endpoint to use OAuth tokens if available
app.post('/api/email/fetch', auth.authMiddleware, async (req, res) => {
  try {
    console.log('Email fetch request received');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User ID from auth:', req.user?.id);
    
    const userId = req.user?.id;
    
    if (!userId) {
      console.log('No user ID found in request');
      return res.status(401).json({ error: 'Authentication required. No user ID found.' });
    }
    
    const { credentials, options } = req.body;
    
    console.log('Credentials provided:', credentials ? 'Yes' : 'No');
    console.log('Options provided:', options ? 'Yes' : 'No');
    
    // If credentials are provided directly, use them
    if (credentials && Object.keys(credentials).length > 0) {
      console.log('Using provided credentials. OAuth?', credentials.useOAuth ? 'Yes' : 'No');
      
      // Check if we have OAuth info in the credentials
      if (credentials.useOAuth && credentials.provider) {
        // Get OAuth tokens from the database
        const { data: tokens, error: tokensError } = await supabase
          .from('email_oauth_tokens')
          .select('*')
          .eq('user_id', userId)
          .eq('provider', credentials.provider)
          .single();
        
        if (tokensError) throw tokensError;
        
        // Check if token is expired and refresh if needed
        const now = new Date();
        const expiresAt = new Date(tokens.expires_at);
        
        let accessToken = tokens.access_token;
        
        if (expiresAt <= now && tokens.refresh_token) {
          // Token is expired, refresh it
          const refreshed = await emailService.refreshOAuth2Token({
            provider: tokens.provider,
            refreshToken: tokens.refresh_token
          });
          
          // Update tokens in the database
          const { error: updateError } = await supabase
            .from('email_oauth_tokens')
            .update({
              access_token: refreshed.accessToken,
              refresh_token: refreshed.refreshToken || tokens.refresh_token,
              expires_at: new Date(refreshed.expiresAt).toISOString(),
              updated_at: new Date()
            })
            .eq('user_id', userId)
            .eq('provider', tokens.provider);
          
          if (updateError) throw updateError;
          
          accessToken = refreshed.accessToken;
        }
        
        // Get user email from user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', userId)
          .single();
        
        if (profileError) {
          console.error('Error retrieving user profile:', profileError);
          
          // Try to get email from auth user if profile not found
          let userEmail = null;
          
          try {
            const { data: authUser, error: authError } = await supabase.auth.getUser();
            
            if (!authError && authUser && authUser.user && authUser.user.email) {
              console.log('Found email from auth user:', authUser.user.email);
              userEmail = authUser.user.email;
            } else {
              console.error('Could not retrieve email from auth user:', authError || 'No email found');
            }
          } catch (authErr) {
            console.error('Error accessing auth user:', authErr);
          }
          
          if (!userEmail) {
            return res.status(400).json({ error: 'Could not determine user email for OAuth. Please update your profile.' });
          }
          
          // Use the email from auth user
          console.log('Using email from auth instead of profile:', userEmail);
          
          // Use OAuth2 for authentication
          const oauthCredentials = {
            host: credentials.host || 'imap.gmail.com',
            port: credentials.port || 993,
            secure: credentials.secure !== false,
            user: userEmail,
            oauth2: {
              accessToken,
              provider: credentials.provider
            }
          };
          
          // Fetch emails using the email service with OAuth
          console.log('Fetching emails using OAuth credentials');
          const emails = await emailService.fetchEmails(oauthCredentials, options);
          
          // Return the emails
          return res.json({ emails });
        }
        
        console.log('User profile found with email:', profile.email);
        
        // Use OAuth2 for authentication
        const oauthCredentials = {
          host: credentials.host || 'imap.gmail.com',
          port: credentials.port || 993,
          secure: credentials.secure !== false,
          user: profile.email,
          oauth2: {
            accessToken,
            provider: credentials.provider
          }
        };
        
        // Fetch emails using the email service with OAuth
        console.log('Fetching emails using OAuth credentials');
        const emails = await emailService.fetchEmails(oauthCredentials, options);
        
        // Process and return emails
        // Store email metadata in Supabase for the user if needed
        if (req.body.saveMetadata) {
          const emailMetadata = emails.map(email => ({
            user_id: userId,
            message_id: email.messageId,
            subject: email.subject,
            from: email.from,
            received_date: email.receivedDate,
            has_attachments: email.attachments.length > 0
          }));

          const { error } = await supabase
            .from('email_metadata')
            .upsert(emailMetadata, { 
              onConflict: 'message_id,user_id',
              ignoreDuplicates: false
            });

          if (error) console.error('Error saving email metadata:', error);
        }
        
        return res.json({ emails });
      } else if (credentials.host && credentials.user && credentials.password) {
        // Use password-based authentication
        const emails = await emailService.fetchEmails(credentials, options);
        
        // Process and return emails
        if (req.body.saveMetadata) {
          const emailMetadata = emails.map(email => ({
            user_id: userId,
            message_id: email.messageId,
            subject: email.subject,
            from: email.from,
            received_date: email.receivedDate,
            has_attachments: email.attachments.length > 0
          }));

          const { error } = await supabase
            .from('email_metadata')
            .upsert(emailMetadata, { 
              onConflict: 'message_id,user_id',
              ignoreDuplicates: false
            });

          if (error) console.error('Error saving email metadata:', error);
        }
        
        return res.json({ emails });
      } else {
        return res.status(400).json({ error: 'Invalid credentials format' });
      }
    } else {
      // If no credentials provided, try to use stored configuration
      console.log('No credentials provided, trying to use stored configuration for user:', userId);
      
      const { data: config, error: configError } = await supabase
        .from('email_configurations')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (configError) {
        console.error('Error retrieving email configuration:', configError);
        throw configError;
      }
      
      if (!config) {
        console.log('No email configuration found for user');
        return res.status(400).json({ error: 'Email not configured. Please set up your email first.' });
      }
      
      console.log('Email configuration found. Provider:', config.provider || 'None (password-based)');
      
      if (config.provider) {
        // OAuth-based configuration
        console.log('Using OAuth configuration for provider:', config.provider);
        
        // Get OAuth tokens from the database
        const { data: tokens, error: tokensError } = await supabase
          .from('email_oauth_tokens')
          .select('*')
          .eq('user_id', userId)
          .eq('provider', config.provider)
          .single();
        
        if (tokensError) {
          console.error('Error retrieving OAuth tokens:', tokensError);
          throw tokensError;
        }
        
        console.log('OAuth tokens found. Expires at:', tokens.expires_at);
        
        // Check if token is expired and refresh if needed
        const now = new Date();
        const expiresAt = new Date(tokens.expires_at);
        
        let accessToken = tokens.access_token;
        
        if (expiresAt <= now && tokens.refresh_token) {
          // Token is expired, refresh it
          const refreshed = await emailService.refreshOAuth2Token({
            provider: tokens.provider,
            refreshToken: tokens.refresh_token
          });
          
          // Update tokens in the database
          const { error: updateError } = await supabase
            .from('email_oauth_tokens')
            .update({
              access_token: refreshed.accessToken,
              refresh_token: refreshed.refreshToken || tokens.refresh_token,
              expires_at: new Date(refreshed.expiresAt).toISOString(),
              updated_at: new Date()
            })
            .eq('user_id', userId)
            .eq('provider', tokens.provider);
          
          if (updateError) throw updateError;
          
          accessToken = refreshed.accessToken;
        }
        
        // Get user email from user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', userId)
          .single();
        
        if (profileError) {
          console.error('Error retrieving user profile:', profileError);
          
          // Try to get email from auth user if profile not found
          let userEmail = null;
          
          try {
            const { data: authUser, error: authError } = await supabase.auth.getUser();
            
            if (!authError && authUser && authUser.user && authUser.user.email) {
              console.log('Found email from auth user:', authUser.user.email);
              userEmail = authUser.user.email;
            } else {
              console.error('Could not retrieve email from auth user:', authError || 'No email found');
            }
          } catch (authErr) {
            console.error('Error accessing auth user:', authErr);
          }
          
          if (!userEmail) {
            return res.status(400).json({ error: 'Could not determine user email for OAuth. Please update your profile.' });
          }
          
          // Use the email from auth user
          console.log('Using email from auth instead of profile:', userEmail);
          
          // Determine provider-specific host settings
          let hostConfig = { host: 'imap.gmail.com', port: 993, secure: true };
          
          switch(tokens.provider) {
            case 'outlook':
              hostConfig = { host: 'outlook.office365.com', port: 993, secure: true };
              break;
            case 'yahoo':
              hostConfig = { host: 'imap.mail.yahoo.com', port: 993, secure: true };
              break;
            // Default is already gmail
          }
          
          // Use OAuth2 for authentication
          const oauthCredentials = {
            host: config.host || hostConfig.host,
            port: config.port || hostConfig.port,
            secure: config.secure !== false,
            user: userEmail,
            oauth2: {
              accessToken,
              provider: tokens.provider
            }
          };
          
          // Fetch emails using the email service with OAuth
          console.log('Fetching emails using OAuth credentials');
          const emails = await emailService.fetchEmails(oauthCredentials, options);
          
          // Return the emails
          return res.json({ emails });
        }
        
        console.log('User profile found with email:', profile.email);
        
        // Use OAuth2 for authentication with the retrieved config
        const oauthCredentials = {
          host: config.host,
          port: config.port || 993,
          secure: config.secure !== false,
          user: profile.email,
          oauth2: {
            accessToken,
            provider: tokens.provider
          }
        };
        
        // Fetch emails using the email service with OAuth
        console.log('Fetching emails using OAuth credentials');
        const emails = await emailService.fetchEmails(oauthCredentials, options);
        
        // Process and return emails
        if (req.body.saveMetadata) {
          const emailMetadata = emails.map(email => ({
            user_id: userId,
            message_id: email.messageId,
            subject: email.subject,
            from: email.from,
            received_date: email.receivedDate,
            has_attachments: email.attachments.length > 0
          }));

          const { error } = await supabase
            .from('email_metadata')
            .upsert(emailMetadata, { 
              onConflict: 'message_id,user_id',
              ignoreDuplicates: false
            });

          if (error) console.error('Error saving email metadata:', error);
        }
        
        return res.json({ emails });
      } else {
        return res.status(400).json({ 
          error: 'Password required for non-OAuth email configuration',
          needsPassword: true
        });
      }
    }
  } catch (error) {
    console.error('Error fetching emails:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add a new endpoint to provide user email for OAuth
app.post('/api/email/manual-setup', auth.authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { email, provider } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Try to create or update a profile with this email
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: email,
          updated_at: new Date()
        }, {
          onConflict: 'id'
        });
        
      if (error) {
        console.error('Error updating profile:', error);
        // Continue anyway, as we'll use the provided email directly
      }
    } catch (profileError) {
      console.error('Error with profile update:', profileError);
      // Continue as we'll use the provided email
    }
    
    // If provider is specified, we can configure OAuth too
    if (provider) {
      // Determine provider-specific email settings
      let emailConfig = {};
      switch (provider) {
        case 'gmail':
          emailConfig = {
            host: 'imap.gmail.com',
            port: 993,
            secure: true
          };
          break;
        case 'outlook':
          emailConfig = {
            host: 'outlook.office365.com',
            port: 993,
            secure: true
          };
          break;
        case 'yahoo':
          emailConfig = {
            host: 'imap.mail.yahoo.com',
            port: 993,
            secure: true
          };
          break;
      }
      
      // Store the email configuration
      try {
        const { error: configError } = await supabase
          .from('email_configurations')
          .upsert({
            user_id: userId,
            host: emailConfig.host,
            port: emailConfig.port,
            secure: emailConfig.secure,
            provider: provider,
            updated_at: new Date()
          }, {
            onConflict: 'user_id'
          });
          
        if (configError) {
          console.error('Error storing email configuration:', configError);
        }
      } catch (configError) {
        console.error('Error with config update:', configError);
      }
    }
    
    res.json({ 
      success: true, 
      message: 'Email settings updated successfully',
      email: email
    });
  } catch (error) {
    console.error('Error updating email settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});