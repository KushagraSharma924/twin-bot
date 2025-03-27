import express from 'express';
import cors from 'cors';
import { config, supabase } from './config/index.js';
import './db/initialize.js'; // Run database initialization
import dotenv from 'dotenv';

// Import middleware
import { authMiddleware, adminMiddleware, emailMiddleware } from './middleware/auth.js';
import calendarService from './services/calendarService.js';

// Import routes
import authRoutes from './routes/auth.js';
import emailRoutes from './routes/email.js';
import aiRoutes from './routes/ai.js';
import calendarRoutes from './routes/calendar.js';
import conversationRoutes from './routes/conversation.js';

// Create Express app
const app = express();
const PORT = config.port;

// CORS Configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Google-Token'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS middleware
app.use(cors(corsOptions));
console.log(`CORS enabled for origin: ${corsOptions.origin}`);

// Log all incoming requests in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
    if (req.method === 'OPTIONS') {
      console.log('Handling OPTIONS preflight request');
    }
    next();
  });
}

// Handle preflight requests
app.options('*', cors(corsOptions));

// Middleware
app.use(express.json());

// Static files
app.use(express.static('public'));

// Apply auth middleware to protected routes
app.use('/api/auth', authRoutes);
app.use('/api/email', emailMiddleware, emailRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);
app.use('/api/calendar', authMiddleware, calendarRoutes);
app.use('/api/conversations', authMiddleware, conversationRoutes);
// Use the AI routes for twin functionality
app.use('/api/twin', authMiddleware, (req, res, next) => {
  // Rewrite the URL path to use our AI endpoints
  req.url = '/twin' + req.url;
  next();
}, aiRoutes);
app.use('/api/browser', authMiddleware);
app.use('/api/user', authMiddleware);
app.use('/api/admin', adminMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: process.env.npm_package_version || '1.0.0' });
});

// Calendar API: Create event
app.post('/api/calendar/create-event', authMiddleware, async (req, res) => {
  try {
    console.log('POST /api/calendar/create-event');
    
    // Get Google token from header with better logging
    const googleToken = req.headers['x-google-token'];
    console.log('Google token header present:', !!googleToken);
    
    if (!googleToken) {
      console.error('Missing Google token in request headers');
      console.log('Available headers:', Object.keys(req.headers));
      return res.status(400).json({ error: 'Google token is required' });
    }
    
    // Get event details from body
    const { event } = req.body;
    console.log('Event data present:', !!event);
    
    if (!event) {
      console.error('Missing event data in request body');
      return res.status(400).json({ error: 'Event details are required' });
    }
    
    // Validate required event fields
    if (!event.summary || !event.start || !event.end) {
      console.error('Missing required event fields:', {
        hasSummary: !!event.summary,
        hasStart: !!event.start,
        hasEnd: !!event.end
      });
      return res.status(400).json({ error: 'Event summary, start, and end times are required' });
    }
    
    try {
      // Create token info object
      const tokenInfo = {
        access_token: googleToken
      };
      
      console.log('Calling calendar service with token info:', {
        hasAccessToken: !!tokenInfo.access_token,
        tokenLength: tokenInfo.access_token.length
      });
      
      // Create the event using Google Calendar API
      const createdEvent = await calendarService.createCalendarEvent(
        tokenInfo,
        event
      );
      
      console.log('Event created successfully');
      res.json({ success: true, event: createdEvent.data });
    } catch (googleError) {
      console.error('Google Calendar API error:', googleError);
      
      // Check for auth errors
      if (googleError.message && (
        googleError.message.includes('Invalid Credentials') || 
        googleError.message.includes('invalid_grant') ||
        googleError.message.includes('Access token is required')
      )) {
        return res.status(401).json({ error: 'Invalid Google credentials' });
      }
      
      throw googleError;
    }
  } catch (error) {
    console.error('Error creating calendar event:', error);
    res.status(500).json({ error: error.message || 'Error creating calendar event' });
  }
});

// Calendar API: Get events
app.get('/api/calendar/events', authMiddleware, async (req, res) => {
  try {
    console.log('GET /api/calendar/events');
    
    // Get Google token from header
    const googleToken = req.headers['x-google-token'];
    if (!googleToken) {
      return res.status(400).json({ error: 'Google token is required' });
    }
    
    // Get date range from query params
    const { start, end } = req.query;
    if (!start || !end) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }
    
    try {
      // Parse dates
      const startDate = new Date(start);
      const endDate = new Date(end);
      
      // Get events from the calendar service
      const events = await calendarService.getAllEvents(
        { access_token: googleToken },
        startDate,
        endDate
      );
      
      res.json({ events });
    } catch (googleError) {
      console.error('Google Calendar API error:', googleError);
      
      if (googleError.message && (
        googleError.message.includes('Invalid Credentials') || 
        googleError.message.includes('invalid_grant')
      )) {
        return res.status(401).json({ error: 'Invalid Google credentials' });
      }
      
      throw googleError;
    }
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({ error: 'Error fetching calendar events' });
  }
});

// Google Calendar Auth URL - Get authentication URL for Google Calendar
app.get('/api/calendar/auth-url', authMiddleware, async (req, res) => {
  try {
    console.log('GET /api/calendar/auth-url');
    const authUrl = calendarService.getAuthUrl();
    res.json({ url: authUrl });
  } catch (error) {
    console.error('Error generating Google auth URL:', error);
    res.status(500).json({ error: 'Error generating Google auth URL' });
  }
});

// Google OAuth Callback handler
app.get('/api/auth/google/callback', async (req, res) => {
  try {
    console.log('GET /api/auth/google/callback');
    
    const { code } = req.query;
    if (!code) {
      console.error('No authorization code provided');
      return res.redirect('http://localhost:3000/dashboard/calendar?error=no_code');
    }
    
    // Exchange code for tokens
    const tokens = await calendarService.getTokens(code);
    
    if (!tokens || !tokens.access_token) {
      console.error('Failed to get tokens from Google');
      return res.redirect('http://localhost:3000/dashboard/calendar?error=token_exchange_failed');
    }
    
    console.log('Successfully obtained token from Google, redirecting to client');
    
    // Create a nice debug string for frontend
    const params = new URLSearchParams({
      access_token: tokens.access_token,
      token_type: tokens.token_type || 'Bearer',
      expires_in: String(tokens.expires_in || 3600),
    });
    
    // Log the redirect URL (without revealing the full token)
    const redirectUrl = `http://localhost:3000/auth-success?${params.toString().replace(tokens.access_token, tokens.access_token.substring(0, 10) + '...')}`;
    console.log('Redirecting to:', redirectUrl);
    
    // Redirect to the client app's success page with token
    res.redirect(`http://localhost:3000/auth-success?${params.toString()}`);
  } catch (error) {
    console.error('Error in Google callback:', error);
    res.redirect('http://localhost:3000/dashboard/calendar?error=callback_error');
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${config.env}`);
  
  // Check for critical dependencies
  if (!supabase) {
    console.error('WARNING: Supabase client is not initialized. Authentication and database features will not work.');
    console.error('Make sure SUPABASE_URL and SUPABASE_KEY environment variables are set correctly.');
  }
  
  // Display available routes
  console.log('\nAvailable routes:');
  console.log('- GET /health');
  console.log('- POST /api/auth/login');
  console.log('- POST /api/auth/register');
  console.log('- GET /api/auth/profile');
  console.log('- POST /api/auth/refresh');  // New token refresh endpoint
  console.log('- POST /api/email/fetch');
  console.log('- POST /api/email/mailboxes');
  console.log('- GET /api/email/config');
  console.log('- POST /api/ai/gemini');
  console.log('- POST /api/ai/openai');
  console.log('- POST /api/ai/embed');
  console.log('- POST /api/calendar/create-event');
  console.log('- GET /api/calendar/events');
  console.log('- GET /api/calendar/holidays');
});