import { supabase } from '../config/index.js';

/**
 * Ensures all necessary tables exist in the database
 */
export async function ensureTables() {
  try {
    console.log('Checking and initializing database tables...');
    
    // Verify and create OAuth state table
    await ensureOAuthStateTable();
    
    // Verify and create email OAuth tokens table
    await ensureEmailOAuthTokensTable();
    
    // Verify and create email configurations table
    await ensureEmailConfigurationsTable();
    
    // Verify and create email metadata table
    await ensureEmailMetadataTable();
    
    console.log('Database initialization complete.');
  } catch (error) {
    console.error('Error initializing database tables:', error);
  }
}

/**
 * Ensure oauth_states table exists
 */
async function ensureOAuthStateTable() {
  const { error: checkError } = await supabase
    .from('oauth_states')
    .select('id')
    .limit(1);
  
  if (checkError && checkError.code === '42P01') { // PostgreSQL error for undefined table
    console.log('Creating oauth_states table...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.oauth_states (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        state TEXT NOT NULL,
        provider TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT oauth_states_state_key UNIQUE (state)
      );
    `;
    
    const { error: createError } = await supabase.rpc('exec', { query: createTableSQL });
    if (createError) {
      console.error('Error creating oauth_states table:', createError);
    } else {
      console.log('oauth_states table created successfully');
    }
  } else {
    console.log('oauth_states table exists');
  }
}

/**
 * Ensure email_oauth_tokens table exists
 */
async function ensureEmailOAuthTokensTable() {
  const { error: checkError } = await supabase
    .from('email_oauth_tokens')
    .select('id')
    .limit(1);
  
  if (checkError && checkError.code === '42P01') {
    console.log('Creating email_oauth_tokens table...');
    
    const createTableSQL = `
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
    
    const { error: createError } = await supabase.rpc('exec', { query: createTableSQL });
    if (createError) {
      console.error('Error creating email_oauth_tokens table:', createError);
    } else {
      console.log('email_oauth_tokens table created successfully');
    }
  } else {
    console.log('email_oauth_tokens table exists');
  }
}

/**
 * Ensure email_configurations table exists
 */
async function ensureEmailConfigurationsTable() {
  const { error: checkError } = await supabase
    .from('email_configurations')
    .select('id')
    .limit(1);
  
  if (checkError && checkError.code === '42P01') {
    console.log('Creating email_configurations table...');
    
    const createTableSQL = `
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
    
    const { error: createError } = await supabase.rpc('exec', { query: createTableSQL });
    if (createError) {
      console.error('Error creating email_configurations table:', createError);
    } else {
      console.log('email_configurations table created successfully');
    }
  } else {
    console.log('email_configurations table exists');
  }
}

/**
 * Ensure email_metadata table exists
 */
async function ensureEmailMetadataTable() {
  const { error: checkError } = await supabase
    .from('email_metadata')
    .select('id')
    .limit(1);
  
  if (checkError && checkError.code === '42P01') {
    console.log('Creating email_metadata table...');
    
    const createTableSQL = `
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
    
    const { error: createError } = await supabase.rpc('exec', { query: createTableSQL });
    if (createError) {
      console.error('Error creating email_metadata table:', createError);
    } else {
      console.log('email_metadata table created successfully');
    }
  } else {
    console.log('email_metadata table exists');
  }
}

// Initialize tables on module import
ensureTables(); 