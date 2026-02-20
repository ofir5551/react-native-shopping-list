-- Create a SECURITY DEFINER function to look up a list_id by share_code
-- This bypasses RLS so any authenticated user can resolve a share code to join a list,
-- without being able to see any other list data.
CREATE OR REPLACE FUNCTION get_list_id_by_share_code(p_share_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_list_id TEXT;
BEGIN
  SELECT id INTO v_list_id
  FROM lists
  WHERE share_code = p_share_code;

  RETURN v_list_id; -- Returns NULL if not found
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_list_id_by_share_code(TEXT) TO authenticated;
