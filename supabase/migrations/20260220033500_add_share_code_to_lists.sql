-- Add a numeric share_code to the lists table
-- This generates a unique 6-digit numeric code for each list used for sharing
-- instead of exposing the raw UUID

-- Add the column with a unique constraint
ALTER TABLE lists ADD COLUMN share_code TEXT;

-- Create a function that generates a unique 6-digit numeric code
CREATE OR REPLACE FUNCTION generate_unique_share_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  collision BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 6-digit number, zero-padded
    code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    -- Check for collision
    SELECT EXISTS (SELECT 1 FROM lists WHERE share_code = code) INTO collision;
    EXIT WHEN NOT collision;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to auto-assign a share_code on insert if not provided
CREATE OR REPLACE FUNCTION set_share_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.share_code IS NULL THEN
    NEW.share_code := generate_unique_share_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lists_set_share_code
  BEFORE INSERT ON lists
  FOR EACH ROW EXECUTE FUNCTION set_share_code();

-- Backfill existing rows that have no share_code
UPDATE lists SET share_code = generate_unique_share_code() WHERE share_code IS NULL;

-- Now enforce uniqueness and not-null
ALTER TABLE lists ALTER COLUMN share_code SET NOT NULL;
ALTER TABLE lists ADD CONSTRAINT lists_share_code_unique UNIQUE (share_code);

-- Update the joinList flow: list_shares references list_id (UUID) but users will supply share_code.
-- We'll handle the lookup in the app layer (SupabaseStorageProvider) by querying 
-- lists.share_code to get the list_id, then inserting into list_shares.
