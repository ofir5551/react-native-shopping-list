-- Enable Supabase Realtime for lists and list_shares tables.
-- Without this, postgres_changes subscriptions receive no events.

ALTER PUBLICATION supabase_realtime ADD TABLE lists;
ALTER PUBLICATION supabase_realtime ADD TABLE list_shares;
