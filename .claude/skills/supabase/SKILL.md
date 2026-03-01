---
name: supabase
description: Work on Supabase migrations, RLS policies, edge functions, or schema changes for this app. Use when modifying database schema, adding policies, or writing/editing edge functions.
---

# Supabase Skill

## Project layout

- `supabase/config.toml` — Supabase project config
- `supabase/migrations/` — SQL migration files (run in order)
- `supabase/functions/` — Deno edge functions

## Key schema facts

- Lists table stores `owner_id` (UUID, references auth.users) and `share_code` (short string)
- RLS policies enforce: owners can do everything; shared users can read + update items only
- Realtime is enabled on the lists table — the `SupabaseStorageProvider` subscribes via `channel()`

## Before editing

1. Read existing migrations in `supabase/migrations/` to understand current schema.
2. Read `src/storage/SupabaseStorageProvider.ts` to understand how the app queries Supabase.
3. Read relevant RLS policies in the latest migration.

## Migration rules

- New migration files: `supabase/migrations/<timestamp>_<description>.sql`
  - Timestamp format: `YYYYMMDDHHMMSS`
- Always write idempotent SQL (`IF NOT EXISTS`, `OR REPLACE`, etc.)
- Never modify existing migration files — add a new one
- After schema changes, update `SupabaseStorageProvider` if queries are affected

## RLS policy pattern

```sql
-- Enable RLS
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;

-- Owner full access
CREATE POLICY "owner_full" ON lists
  FOR ALL USING (auth.uid() = owner_id);

-- Shared member read
CREATE POLICY "member_read" ON lists
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM list_members
      WHERE list_id = lists.id AND user_id = auth.uid()
    )
  );
```

## Useful commands

```bash
npx supabase db diff          # Show schema diff vs migrations
npx supabase db push          # Apply pending migrations to remote
npx supabase functions deploy # Deploy edge functions
npx supabase start            # Start local Supabase stack
```

## Arguments

$ARGUMENTS

## Deliver

- List files created or modified
- Describe schema changes and their purpose
- Note any app-side (`SupabaseStorageProvider`) changes needed
