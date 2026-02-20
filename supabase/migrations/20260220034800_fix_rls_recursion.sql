-- Fix infinite RLS recursion between `lists` and `list_shares`.
--
-- Root cause: 
--   lists  SELECT policy → subquery on list_shares
--   list_shares SELECT policy → subquery on lists
--   → infinite loop
--
-- Fix: use SECURITY DEFINER functions to check membership without triggering RLS.

-- Helper: check if the current user has a share entry for a given list
-- Runs as the function owner (bypasses RLS) so no recursion occurs.
CREATE OR REPLACE FUNCTION is_list_shared_with_me(p_list_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM list_shares
    WHERE list_id = p_list_id AND user_id = auth.uid()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION is_list_shared_with_me(TEXT) TO authenticated;

-- Helper: check if the current user owns a given list
CREATE OR REPLACE FUNCTION is_list_owner(p_list_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM lists
    WHERE id = p_list_id AND user_id = auth.uid()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION is_list_owner(TEXT) TO authenticated;

-- ── lists policies ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can select their own lists" ON lists;
DROP POLICY IF EXISTS "Users can select their own and shared lists" ON lists;

CREATE POLICY "Users can select their own and shared lists"
ON lists FOR SELECT
USING (
  auth.uid() = user_id OR is_list_shared_with_me(id)
);

DROP POLICY IF EXISTS "Users can update their own lists" ON lists;
DROP POLICY IF EXISTS "Users can update their own and shared lists" ON lists;

CREATE POLICY "Users can update their own and shared lists"
ON lists FOR UPDATE
USING (
  auth.uid() = user_id OR is_list_shared_with_me(id)
);

-- ── list_shares policies ─────────────────────────────────────────────────────
-- Use is_list_owner() instead of a direct subquery on lists to avoid recursion.
DROP POLICY IF EXISTS "Users can view relevant shares" ON list_shares;

CREATE POLICY "Users can view relevant shares"
ON list_shares FOR SELECT
USING (
  auth.uid() = user_id OR is_list_owner(list_id)
);

DROP POLICY IF EXISTS "Users can delete relevant shares" ON list_shares;

CREATE POLICY "Users can delete relevant shares"
ON list_shares FOR DELETE
USING (
  auth.uid() = user_id OR is_list_owner(list_id)
);
