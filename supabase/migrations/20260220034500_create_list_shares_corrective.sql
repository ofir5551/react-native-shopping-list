-- Corrective migration: list_shares was marked as applied but never ran on the remote DB.
-- This creates the table and its policies now.

CREATE TABLE IF NOT EXISTS list_shares (
  list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at BIGINT NOT NULL,
  PRIMARY KEY (list_id, user_id)
);

ALTER TABLE list_shares ENABLE ROW LEVEL SECURITY;

-- A user can see shares for lists they own, or shares involving themselves
CREATE POLICY "Users can view relevant shares"
ON list_shares FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM lists WHERE lists.id = list_shares.list_id AND lists.user_id = auth.uid())
);

-- A user can insert a share for themselves (joining a list)
CREATE POLICY "Users can insert their own share to join a list"
ON list_shares FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- A user can delete their own share (leave a list) or the owner can remove a share
CREATE POLICY "Users can delete relevant shares"
ON list_shares FOR DELETE
USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM lists WHERE lists.id = list_shares.list_id AND lists.user_id = auth.uid())
);

-- Update existing lists table policies to allow shared access (idempotent drops)
DROP POLICY IF EXISTS "Users can select their own lists" ON lists;
DROP POLICY IF EXISTS "Users can select their own and shared lists" ON lists;
CREATE POLICY "Users can select their own and shared lists"
ON lists FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM list_shares WHERE list_shares.list_id = lists.id AND list_shares.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can update their own lists" ON lists;
DROP POLICY IF EXISTS "Users can update their own and shared lists" ON lists;
CREATE POLICY "Users can update their own and shared lists"
ON lists FOR UPDATE
USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM list_shares WHERE list_shares.list_id = lists.id AND list_shares.user_id = auth.uid())
);
