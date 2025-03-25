-- Create email_metadata table
CREATE TABLE IF NOT EXISTS public.email_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Add row level security (RLS) policies
ALTER TABLE public.email_metadata ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view only their own email metadata
CREATE POLICY email_metadata_select_policy ON public.email_metadata
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy to allow users to insert only their own email metadata
CREATE POLICY email_metadata_insert_policy ON public.email_metadata
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update only their own email metadata
CREATE POLICY email_metadata_update_policy ON public.email_metadata
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy to allow users to delete only their own email metadata
CREATE POLICY email_metadata_delete_policy ON public.email_metadata
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create a stored procedure to clean up old email metadata (optional)
CREATE OR REPLACE FUNCTION public.cleanup_old_email_metadata() RETURNS void AS $$
BEGIN
  -- Delete email metadata older than 30 days (this can be adjusted as needed)
  DELETE FROM public.email_metadata
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Create a function to search email subjects (optional)
CREATE OR REPLACE FUNCTION public.search_emails(
  search_term TEXT,
  user_id UUID DEFAULT auth.uid()
) RETURNS SETOF public.email_metadata AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.email_metadata
  WHERE 
    user_id = search_emails.user_id AND
    (
      subject ILIKE ('%' || search_term || '%') OR
      "from" ILIKE ('%' || search_term || '%')
    )
  ORDER BY received_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 