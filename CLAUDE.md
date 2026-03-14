# Shopping List App

Expo + React Native + TypeScript shopping list app with Supabase cloud sync and real-time sharing.

## Commands

- `npm start` — start Expo dev server (all platforms)
- `npm run web` — start web only (fastest for testing)
- `npm run android` / `npm run ios` — start on device/emulator
- `npm test` — run Jest test suite (always run after implementing a feature)

## Tech Stack

- **Expo SDK 54**, React Native 0.81, React 19, TypeScript
- **Supabase** — auth, Postgres DB, realtime subscriptions
- **AsyncStorage** — primary data store for all users (offline-first)

## Architecture

```
App.tsx
  AuthProvider        → AuthContext (Supabase session)
    SyncProvider      → SyncContext (always LocalStorage + SyncEngine for auth users)
      ThemeProvider
        ToastProvider
          HomeScreen  → useShoppingListsApp() — all state/logic
```

Key directories:
- `src/screens/` — HomeScreen (router), ListsScreen, ShoppingListScreen, SettingsScreen
- `src/components/` — ItemRow, Header, Fab, modals, etc.
- `src/context/` — AuthContext, SyncContext, ThemeContext, ToastContext
- `src/hooks/useShoppingListsApp.ts` — single hook that owns all app state
- `src/storage.ts` — LocalStorageProvider + StorageProvider interface
- `src/sync/SupabaseApiClient.ts` — thin Supabase API wrapper (fetch, upsert, join, leave, delete, realtime)
- `src/sync/SyncEngine.ts` — background sync orchestrator (merge, dirty queue, retry backoff)
- `src/types.ts` — ShoppingItem, ShoppingList, AppRoute
- `src/utils/` — recents helpers
- `supabase/` — config, migrations, edge functions

## Offline-First Architecture

AsyncStorage is the **primary data store for all users**. Supabase is a background sync target, never the source of truth at read time.

```
Unauth:  writes → LocalStorage
Auth:    writes → LocalStorage → SyncEngine → Supabase (async, with retry)
         reads  ← LocalStorage always (instant, works offline)
```

**SyncEngine** (`src/sync/SyncEngine.ts`):
- On auth: pulls server lists, merges with local, subscribes to realtime
- On local save: marks dirty list IDs, pushes to Supabase in background
- On push failure: exponential backoff retry (2s → 30s max)
- Dirty queue persisted in AsyncStorage (`@sync_dirty_ids`, `@sync_pending_deletes`) — survives app restart
- `isMergingRemote` flag prevents re-push during remote merge

**Merge rules** (server vs local, by `updatedAt`):
- Server only → add to local (new shared list from another device)
- Both exist, server newer → use server
- Both exist, local newer → keep local, mark dirty
- Local only, owned by user or no owner → keep, mark dirty (push to server)
- Local only, owned by someone else → drop (owner deleted the shared list)

**Online-only operations** — throw if offline, caught by existing try/catch in hook:
- `joinList` — requires server round-trip to look up share code
- `leaveList` — requires server round-trip to remove `list_shares` row

**Delete while offline** — removes from local immediately, queues server delete.

## Storage Invariants (do not break)

- **Never persist before hydration**: check `isHydrated` before saving
- **Storage keys are frozen**: `@shopping_lists` (lists), `@shopping_route` (current route), `@sync_dirty_ids`, `@sync_pending_deletes`, `@shopping_saved_sets` (saved sets)
- **Recents rules**: dedupe names, newest first, max 12 entries (`MAX_RECENTS`)
- **Lists sorted**: by `updatedAt` descending in UI; items by `createdAt` descending
- **Realtime guard**: `isFromRealtimeRef` prevents save loops on realtime updates

## Sharing / Auth Rules

- `ShoppingList.ownerId` — set when created by authenticated user
- `ShoppingList.shareCode` — short code for joining; falls back to list ID
- Owner-only actions: delete list, rename list
- Non-owner actions: leave list (removes from their view, not Supabase)
- No migration needed on sign-in — SyncEngine's initial merge handles local + server data naturally
- `SyncContext` exposes `joinList`, `leaveList`, `deleteListFromServer` — hook delegates through these, not `storageProvider`

## Testing

- **Run `npm test` at the end of every feature implementation** — all tests must pass before committing.
- Test files are co-located with source: `src/**/*.test.ts` / `*.test.tsx`
- Uses `jest-expo` preset with `@testing-library/react-native` for component tests
- AsyncStorage is mocked globally in `jest.setup.js`; Supabase and expo modules are mocked per-test
- If you add or change business logic (sync, storage, validation), add or update the relevant tests

## Patterns

- All list mutations go through `updateListById()` in `useShoppingListsApp`
- Items are deduped by normalized name (lowercase trim) within active items
- Use `showToast()` from `ToastContext` for user feedback
- `StorageProvider` interface: `loadLists`, `saveLists`, optional `subscribe` (join/leave/delete go through `SyncContext`, not `storageProvider`)
- `supabase.ts` uses a `resilientFetch` wrapper — network errors return HTTP 400 so the SDK fails fast instead of retrying infinitely
- New components belong in `src/components/`; new screens belong in `src/screens/`
- If you ever create utility scripts to execute commands - make sure to cleanup after and never commit them.

## Manual Test Checklist

When validating changes, cover these flows:
- Add single item / add multiple items
- Toggle item complete ↔ incomplete
- Delete item; clear all items
- Recents populate after add, dedupe correctly, cap at 12
- Persistence survives page reload
- Empty state renders correctly
- Modal open/close and keyboard submit behavior
- Join a shared list via share code
- Owner can delete/rename; non-owner sees leave option
- Offline cold start: kill network, reload → lists load instantly, no spinner hang
- Offline edit: add/delete items offline → changes persist; reconnect → synced to server

## Skills

- `/feature` — implement or refactor app features while preserving invariants
- `/commit` — stage, commit with a good message, and push
- `/supabase` — work on Supabase migrations, RLS policies, or edge functions
