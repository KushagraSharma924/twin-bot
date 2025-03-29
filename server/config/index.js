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
  },

  // Service status tracking
  serviceStatus: {
    ollama: false,
    tensorflow: false
  }
};

// Initialize Supabase client with validation
export const supabase = config.supabase.url && config.supabase.key 
  ? createClient(config.supabase.url, config.supabase.key, {
      auth: {
        persistSession: false,
        autoRefreshToken: true,
      },
      global: {
        fetch: (url, options) => {
          const fetchOptions = {
            ...options,
            timeout: 30000, // Increase timeout to 30 seconds
            headers: {
              ...options?.headers,
              'Cache-Control': 'no-cache',
            },
          };
          
          // Custom fetch with retry logic
          const customFetch = async (attempt = 1, maxAttempts = 3) => {
            try {
              return await fetch(url, fetchOptions);
            } catch (error) {
              if (attempt < maxAttempts) {
                console.log(`Fetch attempt ${attempt} failed, retrying...`);
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

// Initialize Google OAuth2 client
export const oauth2Client = new google.auth.OAuth2(
  config.google.clientId,
  config.google.clientSecret,
  config.google.redirectUri
);

/**
 * Initialize pgvector extension if needed
 */
export async function initPgVector() {
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