import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Load server/.env if running in production mode or if Supabase credentials are missing
if (process.env.NODE_ENV === 'production' || !process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  try {
    const serverEnvPath = path.join(process.cwd(), 'server', '.env');
    if (fs.existsSync(serverEnvPath)) {
      console.log('Loading server/.env file for production or missing credentials');
      dotenv.config({ path: serverEnvPath });
    }
  } catch (error) {
    console.error('Error loading server/.env file:', error);
  }
}

// Log environment status for debugging
console.log('Environment:', process.env.NODE_ENV);
console.log('Working directory:', process.cwd());

// Check if we have Supabase config
const hasDatabaseConfig = process.env.SUPABASE_URL && process.env.SUPABASE_KEY;

// Validate environment variables, but don't crash the server
if (!process.env.SUPABASE_URL) {
  console.warn('WARNING: SUPABASE_URL environment variable is missing - database features will be disabled');
}

if (!process.env.SUPABASE_KEY) {
  console.warn('WARNING: SUPABASE_KEY environment variable is missing - database features will be disabled');
}

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn('WARNING: Google API credentials are missing - Google OAuth features will be disabled');
}

// Export configuration
export const config = {
  // Server config
  port: process.env.PORT || 5002,
  env: process.env.NODE_ENV || 'development',
  
  // Supabase config
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    enabled: hasDatabaseConfig
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
  },

  // Service status tracking
  serviceStatus: {
    ollama: false,
    tensorflow: false
  }
};

// Initialize Supabase client only if configuration is available
export const supabase = hasDatabaseConfig
  ? createClient(config.supabase.url, config.supabase.key, {
      auth: {
        persistSession: false,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          'apikey': config.supabase.key,
          'Authorization': `Bearer ${config.supabase.key}`,
          'Content-Type': 'application/json',
        },
        fetch: (url, options = {}) => {
          // Always ensure required headers are present
          const fetchOptions = {
            ...options,
            timeout: 30000, // Increase timeout to 30 seconds
            headers: {
              // Ensure these headers are always included
              'apikey': config.supabase.key,
              'Authorization': `Bearer ${config.supabase.key}`,
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache',
              // Include any headers that were passed
              ...(options.headers || {})
            },
          };
          
          // Debug trace
          console.log(`Supabase request to ${url.toString().split('?')[0]}`);
          
          // Custom fetch with retry logic
          const customFetch = async (attempt = 1, maxAttempts = 3) => {
            try {
              const response = await fetch(url, fetchOptions);
              
              // If we get a 401 or 403, try to refresh the headers and retry
              if ((response.status === 401 || response.status === 403) && attempt < maxAttempts) {
                console.log(`Auth error on attempt ${attempt}, refreshing headers and retrying...`);
                
                // Refresh the headers
                fetchOptions.headers = {
                  ...fetchOptions.headers,
                  'apikey': config.supabase.key,
                  'Authorization': `Bearer ${config.supabase.key}`,
                };
                
                // Wait a bit before retrying
                await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt - 1)));
                return customFetch(attempt + 1, maxAttempts);
              }
              
              return response;
            } catch (error) {
              if (attempt < maxAttempts) {
                console.log(`Fetch attempt ${attempt} failed, retrying...`, error.message);
                // Exponential backoff - wait longer between each retry
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
                return customFetch(attempt + 1, maxAttempts);
              }
              console.error(`All fetch attempts failed for: ${url}`);
              throw error;
            }
          };
          
          return customFetch();
        }
      }
    })
  : null;

// Log Supabase status
if (supabase) {
  console.log('Supabase client initialized successfully');
} else {
  console.warn('Supabase client not initialized - running without database functionality');
}

// Initialize Google OAuth2 client if credentials are available
export const oauth2Client = config.google.clientId && config.google.clientSecret
  ? new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri
    )
  : null;

/**
 * Initialize pgvector extension if needed
 */
export async function initPgVector() {
  if (!supabase) {
    console.warn('Skipping pgvector initialization - Supabase not configured');
    return { success: false, message: 'Supabase not configured' };
  }
  
  try {
    console.log('Checking pgvector extension status...');
    
    // Check if pgvector extension exists
    const { data, error } = await supabase.from('pg_extension')
      .select('extname')
      .eq('extname', 'vector')
      .maybeSingle();
    
    if (error) {
      // If error, it's likely the pg_extension view doesn't exist or isn't accessible
      console.warn('Could not check pgvector extension status:', error.message);
      return { success: false, message: 'Could not check pgvector status', error };
    }
    
    if (data) {
      console.log('pgvector extension is already installed');
      return { success: true, exists: true };
    }
    
    // Try to create the extension
    console.log('Attempting to enable pgvector extension...');
    
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: 'CREATE EXTENSION IF NOT EXISTS vector;'
    });
    
    if (createError) {
      console.error('Failed to enable pgvector extension:', createError);
      return { 
        success: false, 
        message: 'Failed to enable pgvector extension', 
        error: createError 
      };
    }
    
    console.log('Successfully enabled pgvector extension');
    return { success: true, enabled: true };
  } catch (error) {
    console.error('Error initializing pgvector:', error);
    return { success: false, message: 'Error initializing pgvector', error };
  }
}

// Export all config
export default {
  supabase,
  initPgVector
}; 