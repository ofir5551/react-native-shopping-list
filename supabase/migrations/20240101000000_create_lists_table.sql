-- Create the lists table
CREATE TABLE lists (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  recents JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Enable Row Level Security (RLS)
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;

-- Create policies so users can only access their own lists
CREATE POLICY "Users can select their own lists" 
ON lists FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own lists" 
ON lists FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lists" 
ON lists FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lists" 
ON lists FOR DELETE 
USING (auth.uid() = user_id);
