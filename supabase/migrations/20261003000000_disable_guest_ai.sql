-- Anonymous users get no AI calls. Their quota was keyed by user id, and a fresh
-- anonymous id is free to mint (sign out, reinstall, or call signInAnonymously),
-- so any per-user guest allowance was unlimited in practice.

CREATE OR REPLACE FUNCTION check_and_increment_ai_usage(p_is_anonymous BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_is_anonymous THEN
    RETURN jsonb_build_object('allowed', false, 'count', 0, 'limit', 0);
  END IF;

  INSERT INTO ai_usage (user_id, call_date, call_count)
  VALUES (auth.uid(), CURRENT_DATE, 1)
  ON CONFLICT (user_id, call_date)
  DO UPDATE SET call_count = ai_usage.call_count + 1
  RETURNING call_count INTO v_count;

  IF v_count > 20 THEN
    -- Roll back the increment — this call is not allowed
    UPDATE ai_usage
    SET call_count = call_count - 1
    WHERE user_id = auth.uid() AND call_date = CURRENT_DATE;

    RETURN jsonb_build_object('allowed', false, 'count', v_count - 1, 'limit', 20);
  END IF;

  RETURN jsonb_build_object('allowed', true, 'count', v_count, 'limit', 20);
END;
$$;
