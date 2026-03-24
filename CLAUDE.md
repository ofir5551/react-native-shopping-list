# Shopping List App

Expo + React Native + TypeScript shopping list app with Supabase cloud sync and real-time sharing.

## Commands

- `npm start` — start Expo dev server (all platforms)
- `npm run web` — start web only (fastest for testing)
- `npm run android` / `npm run ios` — start on device/emulator
- `npm test` — run Jest test suite (**always run after implementing a feature**)

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
- `src/sync/SyncEngine.ts` — background sync orchestrator (merge, dirty queue, retry backoff)
- `src/sync/SupabaseApiClient.ts` — thin Supabase API wrapper
- `src/types.ts` — ShoppingItem, ShoppingList, AppRoute
- `supabase/` — config, migrations, edge functions

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

## Testing

- All tests must pass before committing
- Test files co-located with source: `src/**/*.test.ts` / `*.test.tsx`
- AsyncStorage mocked globally in `jest.setup.js`; Supabase and expo modules mocked per-test
- If you add or change business logic (sync, storage, validation), add or update tests
