# Shopping List App

Expo + React Native + TypeScript shopping list app with Supabase cloud sync and real-time sharing.

## Offline-First Architecture

AsyncStorage is the **primary data store for all users**. Supabase is a background sync target, never the source of truth at read time.

```
Unauth:  writes → LocalStorage
Auth:    writes → LocalStorage → SyncEngine → Supabase (async, with retry)
         reads  ← LocalStorage always (instant, works offline)
```

Online-only operations (throw if offline — caught by existing try/catch in hook):
- `joinList` — requires server round-trip to look up share code
- `leaveList` — requires server round-trip to remove `list_shares` row

## Storage Invariants (do not break)

- **Never persist before hydration**: check `isHydrated` before saving
- **Storage keys are frozen**: `@shopping_lists`, `@shopping_route`, `@sync_dirty_ids`, `@sync_pending_deletes`, `@shopping_saved_sets`
- **Recents rules**: dedupe names, newest first, max 12 entries (`MAX_RECENTS`)
- **Lists sorted**: by `updatedAt` descending in UI; items by `createdAt` descending
- **Realtime guard**: `isFromRealtimeRef` prevents save loops on realtime updates

## Sharing / Auth Rules

- `ShoppingList.ownerId` — set when created by an authenticated user
- Owner-only actions: delete list, rename list
- Non-owner actions: leave list (removes from their view, not from Supabase)
- `SyncContext` exposes `joinList`, `leaveList`, `deleteListFromServer` — hook delegates through these, not `storageProvider`

## Patterns

- All list mutations go through `updateListById()` in `useShoppingListsApp`
- Items are deduped by normalized name (lowercase trim) within active items
- Use `showToast()` from `ToastContext` for user feedback
- New components → `src/components/`; new screens → `src/screens/`
- Utility scripts: clean up after use, never commit
- **Always remove redundant or unused code** — dead functions, unreachable branches, obsolete props, unused imports, and leftover variables must be deleted, not commented out

## i18n / RTL

- All UI strings must use `t('key')` from `useLocale()` — never hardcode English text
- Add new strings to both `src/i18n/translations/en.ts` and `src/i18n/translations/he.ts`
- **For every UI change, verify it looks correct in RTL mode** — toggle language to Hebrew in Settings and check layout, icons, and text direction
- Back/forward arrow icons: use `isRTL ? 'arrow-forward' : 'arrow-back'` from `useLocale()`
- `I18nManager.forceRTL()` auto-flips: flexDirection rows, marginLeft/Right, paddingLeft/Right, absolute left/right positions — no manual overrides needed
- Popular items catalog is locale-keyed: `POPULAR_ITEMS[locale]` in `src/data/popularItems.ts`

## Environments (dev / prod)

Two Supabase projects: **dev** `Shoppy-DEV` (`uotuyizxamgwihguofoo`) and **prod** `Shoppy` (`rdyxzhuctlyzhyamqyml`).

- Local `.env` → dev (`expo start`, web, Playwright). EAS `preview`/`production` env vars → prod. `.easignore` keeps `.env*` out of cloud builds.
- `npm run build:android` builds locally and bakes in `.env` (dev) — use EAS builds for anything sent to users.
- Supabase CLI link: `npm run supabase:which` (prints `dev` or `PROD`), `npm run supabase:dev`, `npm run supabase:prod`. **Leave it linked to dev.** Relink to dev right after any prod operation.
- Before any `db push`, `functions deploy`, or `config push`: run `supabase:which` and pass `--project-ref` explicitly on deploys. **Prod writes need the user's explicit go-ahead each time**; dev is free to change.
- The Supabase MCP tools are bound to **prod** — read-only checks only. For dev SQL use `npx supabase db query --linked`.
- Schema changes: new file in `supabase/migrations/`, apply to dev, test, then prod. Never edit an applied migration except to keep it replayable on a fresh DB.
- Dev auth/config is pushed with a minimal throwaway `config.toml` (`supabase config push --project-ref`); never push the repo's full `config.toml` — it describes local dev, not a hosted project.
- Edge functions `parse-photo`/`suggest-items` authenticate in code (deployed with `verify_jwt: false`); `delete-account` relies on `verify_jwt: true`.
- Gemini is the only AI provider. Dev and prod deliberately share one Gemini key/billing for now (preview scale); dev has no `GEMINI_API_KEY` secret unless set manually.
- AI limits live in `check_and_increment_ai_usage` (20/user/day, 1000/day global, guests 0) and in `parse-photo` (image ≤ ~9 MB).

## Testing

- Run `npm test` after implementing a feature; all tests must pass before committing
- AsyncStorage mocked globally in `jest.setup.js`; Supabase and expo modules mocked per-test
- If you add or change business logic (sync, storage, validation), add or update tests
