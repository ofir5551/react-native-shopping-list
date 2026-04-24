-- Track per-user daily AI usage for rate limiting.
-- Anonymous users get 5 calls/day; authenticated users get 20 calls/day.

CREATE TABLE ai_usage (
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  call_date DATE NOT NULL DEFAULT CURRENT_DATE,
  call_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, call_date)
);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage"
  ON ai_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Atomic check-and-increment. Returns { allowed, count, limit }.
-- SECURITY DEFINER so the edge function can call it with the user's JWT
-- without needing INSERT/UPDATE RLS policies on ai_usage.
CREATE OR REPLACE FUNCTION check_and_increment_ai_usage(p_is_anonymous BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_limit INTEGER;
BEGIN
  v_limit := CASE WHEN p_is_anonymous THEN 5 ELSE 20 END;

  INSERT INTO ai_usage (user_id, call_date, call_count)
  VALUES (auth.uid(), CURRENT_DATE, 1)
  ON CONFLICT (user_id, call_date)
  DO UPDATE SET call_count = ai_usage.call_count + 1
  RETURNING call_count INTO v_count;

  IF v_count > v_limit THEN
    -- Roll back the increment — this call is not allowed
    UPDATE ai_usage
    SET call_count = call_count - 1
    WHERE user_id = auth.uid() AND call_date = CURRENT_DATE;

    RETURN jsonb_build_object('allowed', false, 'count', v_count - 1, 'limit', v_limit);
  END IF;

  RETURN jsonb_build_object('allowed', true, 'count', v_count, 'limit', v_limit);
END;
$$;

GRANT EXECUTE ON FUNCTION check_and_increment_ai_usage(BOOLEAN) TO authenticated;
