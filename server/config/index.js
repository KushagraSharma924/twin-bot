import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

// Load environment variables
dotenv.config();

// Validate required environment variables
if (!process.env.SUPABASE_URL) {
  console.error('ERROR: SUPABASE_URL environment variable is required');
  console.log('Available env vars:', Object.keys(process.env).filter(key => key.startsWith('SUPA')));
}

if (!process.env.SUPABASE_KEY) {
  console.error('ERROR: SUPABASE_KEY environment variable is required');
}

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error('WARNING: Google API credentials are missing');
}

// Export configuration
export const config = {
  // Server config
  port: process.env.PORT || 5002,
  env: process.env.NODE_ENV || 'development',
  
  // Supabase config
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY
  },
  
  // Google OAuth config
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI
  },
  
  // Microsoft OAuth config
  microsoft: {
    clientId: process.env.MICROSOFT_EMAIL_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_EMAIL_CLIENT_SECRET
  },
  
  // Yahoo OAuth config
  yahoo: {
    clientId: process.env.YAHOO_CLIENT_ID,
    clientSecret: process.env.YAHOO_CLIENT_SECRET
  }
};

// Initialize Supabase client with validation
export const supabase = config.supabase.url && config.supabase.key 
  ? createClient(config.supabase.url, config.supabase.key)
  : null;

// Initialize Google OAuth2 client
export const oauth2Client = new google.auth.OAuth2(
  config.google.clientId,
  config.google.clientSecret,
  config.google.redirectUri
); 