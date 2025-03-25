-- Create table for storing temporary OAuth states (for security)
CREATE TABLE IF NOT EXISTS public.oauth_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state TEXT NOT NULL,
  provider TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add index for faster lookups
  CONSTRAINT oauth_states_state_key UNIQUE (state)
);

-- Create table for storing OAuth tokens
CREATE TABLE IF NOT EXISTS public.email_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add a unique constraint for user and provider
  CONSTRAINT email_oauth_tokens_user_id_provider_key UNIQUE (user_id, provider),
  
  -- Add foreign key constraint
  CONSTRAINT email_oauth_tokens_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create table for storing email configuration
CREATE TABLE IF NOT EXISTS public.email_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 993,
  secure BOOLEAN NOT NULL DEFAULT TRUE,
  provider TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add a unique constraint for user
  CONSTRAINT email_configurations_user_id_key UNIQUE (user_id),
  
  -- Add foreign key constraint
  CONSTRAINT email_configurations_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add row level security (RLS) policies
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_configurations ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view only their own OAuth states
CREATE POLICY oauth_states_select_policy ON public.oauth_states
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy to allow users to insert only their own OAuth states
CREATE POLICY oauth_states_insert_policy ON public.oauth_states
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to delete only their own OAuth states
CREATE POLICY oauth_states_delete_policy ON public.oauth_states
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create policy to allow users to view only their own OAuth tokens
CREATE POLICY email_oauth_tokens_select_policy ON public.email_oauth_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy to allow users to insert/update only their own OAuth tokens
CREATE POLICY email_oauth_tokens_insert_policy ON public.email_oauth_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY email_oauth_tokens_update_policy ON public.email_oauth_tokens
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy to allow users to view only their own email configuration
CREATE POLICY email_configurations_select_policy ON public.email_configurations
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy to allow users to insert/update only their own email configuration
CREATE POLICY email_configurations_insert_policy ON public.email_configurations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY email_configurations_update_policy ON public.email_configurations
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create a function to clean up old OAuth states
CREATE OR REPLACE FUNCTION public.cleanup_old_oauth_states() RETURNS void AS $$
BEGIN
  -- Delete OAuth states older than 1 hour
  DELETE FROM public.oauth_states
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql; 