-- Global daily cap on AI calls. The per-account limit alone is not a cost ceiling:
-- accounts can be created by script, so total Gemini spend needs its own limit.

CREATE TABLE ai_usage_global (
  call_date  DATE PRIMARY KEY DEFAULT CURRENT_DATE,
  call_count INTEGER NOT NULL DEFAULT 0
);

-- No policies on purpose: only the SECURITY DEFINER function below reads or writes this table.
ALTER TABLE ai_usage_global ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION check_and_increment_ai_usage(p_is_anonymous BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_user_limit   CONSTANT INTEGER := 20;
  c_global_limit CONSTANT INTEGER := 1000;
  v_count  INTEGER;
  v_global INTEGER;
BEGIN
  IF p_is_anonymous THEN
    RETURN jsonb_build_object('allowed', false, 'count', 0, 'limit', 0);
  END IF;

  INSERT INTO ai_usage (user_id, call_date, call_count)
  VALUES (auth.uid(), CURRENT_DATE, 1)
  ON CONFLICT (user_id, call_date)
  DO UPDATE SET call_count = ai_usage.call_count + 1
  RETURNING call_count INTO v_count;

  IF v_count > c_user_limit THEN
    -- Roll back the increment — this call is not allowed
    UPDATE ai_usage
    SET call_count = call_count - 1
    WHERE user_id = auth.uid() AND call_date = CURRENT_DATE;

    RETURN jsonb_build_object('allowed', false, 'count', v_count - 1, 'limit', c_user_limit);
  END IF;

  INSERT INTO ai_usage_global (call_date, call_count)
  VALUES (CURRENT_DATE, 1)
  ON CONFLICT (call_date)
  DO UPDATE SET call_count = ai_usage_global.call_count + 1
  RETURNING call_count INTO v_global;

  IF v_global > c_global_limit THEN
    -- Over the global cap: undo both increments so the user's own quota is not burned
    UPDATE ai_usage_global SET call_count = call_count - 1 WHERE call_date = CURRENT_DATE;
    UPDATE ai_usage
    SET call_count = call_count - 1
    WHERE user_id = auth.uid() AND call_date = CURRENT_DATE;

    RETURN jsonb_build_object('allowed', false, 'count', v_count - 1, 'limit', c_user_limit);
  END IF;

  RETURN jsonb_build_object('allowed', true, 'count', v_count, 'limit', c_user_limit);
END;
$$;
