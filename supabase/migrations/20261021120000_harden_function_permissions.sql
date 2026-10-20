-- Signed-out (anon role) requests must not call SECURITY DEFINER functions.
-- Anonymous app sessions use the authenticated role, so the app is unaffected.
REVOKE EXECUTE ON FUNCTION check_and_increment_ai_usage(BOOLEAN) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION get_list_id_by_share_code(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION is_list_owner(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION is_list_shared_with_me(TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION check_and_increment_ai_usage(BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_list_id_by_share_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_list_owner(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_list_shared_with_me(TEXT) TO authenticated;

-- Trigger function: firing a trigger does not need EXECUTE, so nobody should call it over the API.
REVOKE EXECUTE ON FUNCTION enforce_list_owner_update() FROM PUBLIC, anon, authenticated;

-- Both functions read the lists table unqualified, so pin the schema to public.
ALTER FUNCTION generate_unique_share_code() SET search_path = public;
ALTER FUNCTION set_share_code() SET search_path = public;
