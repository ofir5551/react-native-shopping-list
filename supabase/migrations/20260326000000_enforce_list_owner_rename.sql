-- Prevent non-owners from changing protected columns (name, user_id) on lists.
--
-- The UPDATE RLS policy allows both owners and shared users to update rows,
-- but provides no WITH CHECK to restrict which columns may change.
-- This trigger enforces column-level protection at the database level,
-- so that shared users cannot rename a list or change its ownership
-- even by calling the Supabase API directly.

CREATE OR REPLACE FUNCTION enforce_list_owner_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only the owner may change name or user_id
  IF auth.uid() IS DISTINCT FROM OLD.user_id THEN
    IF NEW.name IS DISTINCT FROM OLD.name THEN
      RAISE EXCEPTION 'Only the list owner can rename a list';
    END IF;
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Only the list owner can change list ownership';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_list_owner_update_trigger
  BEFORE UPDATE ON lists
  FOR EACH ROW
  EXECUTE FUNCTION enforce_list_owner_update();
