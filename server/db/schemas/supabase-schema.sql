-- Create profiles table to store user information
CREATE TABLE profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to restrict profile access to the owner
CREATE POLICY "Users can view only their own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Create conversations table to store chat history
CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  message TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('user', 'assistant')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Create policy to restrict conversation access to the owner
CREATE POLICY "Users can view only their own conversations" 
  ON conversations FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations" 
  ON conversations FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create tasks table to store user tasks
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  task TEXT NOT NULL,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
  deadline TIMESTAMP WITH TIME ZONE,
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policy to restrict task access to the owner
CREATE POLICY "Users can view only their own tasks" 
  ON tasks FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks" 
  ON tasks FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks" 
  ON tasks FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks" 
  ON tasks FOR DELETE 
  USING (auth.uid() = user_id);

-- Create calendar_events table to store references to Google Calendar events
CREATE TABLE calendar_events (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  event_id TEXT NOT NULL,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Create policy to restrict calendar event access to the owner
CREATE POLICY "Users can view only their own calendar events" 
  ON calendar_events FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calendar events" 
  ON calendar_events FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create browser_insights table to store Chrome extension data
CREATE TABLE browser_insights (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  browser_id TEXT,
  insights JSONB NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable RLS
ALTER TABLE browser_insights ENABLE ROW LEVEL SECURITY;

-- Create policy to restrict browser insight access to the owner
CREATE POLICY "Users can view only their own browser insights" 
  ON browser_insights FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own browser insights" 
  ON browser_insights FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create user_preferences table to store user settings
CREATE TABLE user_preferences (
  user_id UUID REFERENCES profiles(id) PRIMARY KEY,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Create policy to restrict preference access to the owner
CREATE POLICY "Users can view only their own preferences" 
  ON user_preferences FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert their own preferences" 
  ON user_preferences FOR ALL 
  USING (auth.uid() = user_id);

-- Create learning_data table for reinforcement learning
CREATE TABLE learning_data (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  interaction JSONB NOT NULL,
  feedback JSONB NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable RLS
ALTER TABLE learning_data ENABLE ROW LEVEL SECURITY;

-- Create policy to restrict learning data access to the owner
CREATE POLICY "Users can view only their own learning data" 
  ON learning_data FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own learning data" 
  ON learning_data FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column() 
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update timestamps
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON user_preferences
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column(); 