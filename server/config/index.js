import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

// Load environment variables
dotenv.config();

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

// Initialize Supabase client
export const supabase = createClient(config.supabase.url, config.supabase.key);

// Initialize Google OAuth2 client
export const oauth2Client = new google.auth.OAuth2(
  config.google.clientId,
  config.google.clientSecret,
  config.google.redirectUri
); 