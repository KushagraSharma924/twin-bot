-- Research Schema
-- Database schema for research automation features

-- Table for research documents
CREATE TABLE IF NOT EXISTS research_documents (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  process_id UUID,
  type VARCHAR(50) NOT NULL CHECK (type IN ('paper', 'article', 'news', 'synthesis', 'graph', 'alert')),
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT,
  source VARCHAR(255),
  url TEXT,
  category VARCHAR(100),
  date_added TIMESTAMP WITH TIME ZONE NOT NULL,
  date_published TIMESTAMP WITH TIME ZONE,
  date_updated TIMESTAMP WITH TIME ZONE,
  saved BOOLEAN DEFAULT FALSE,
  starred BOOLEAN DEFAULT FALSE,
  tags JSONB DEFAULT '[]'::JSONB,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for research processes
CREATE TABLE IF NOT EXISTS research_processes (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('realtime', 'synthesis')),
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  query TEXT,
  sources JSONB,
  document_ids JSONB,
  depth VARCHAR(10),
  category VARCHAR(100),
  max_results INTEGER,
  result_count INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_research_documents_user_id ON research_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_research_documents_type ON research_documents(type);
CREATE INDEX IF NOT EXISTS idx_research_documents_category ON research_documents(category);
CREATE INDEX IF NOT EXISTS idx_research_documents_process_id ON research_documents(process_id);
CREATE INDEX IF NOT EXISTS idx_research_processes_user_id ON research_processes(user_id);
CREATE INDEX IF NOT EXISTS idx_research_processes_status ON research_processes(status);

-- RLS Policies (Row Level Security)
ALTER TABLE research_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_processes ENABLE ROW LEVEL SECURITY;

-- Documents policies
CREATE POLICY "Users can view their own documents"
  ON research_documents
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
  ON research_documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
  ON research_documents
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
  ON research_documents
  FOR DELETE
  USING (auth.uid() = user_id);

-- Processes policies
CREATE POLICY "Users can view their own processes"
  ON research_processes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own processes"
  ON research_processes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own processes"
  ON research_processes
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own processes"
  ON research_processes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role access (for backend operations)
CREATE POLICY "Service role can access all documents"
  ON research_documents
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all processes"
  ON research_processes
  USING (auth.role() = 'service_role'); 