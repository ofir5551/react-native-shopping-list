# Shopping List App

Expo + React Native + TypeScript shopping list app with Supabase cloud sync and real-time sharing.

## Commands

- `npm start` — start Expo dev server (all platforms)
- `npm run web` — start web only (fastest for testing)
- `npm run android` / `npm run ios` — start on device/emulator

## Tech Stack

- **Expo SDK 54**, React Native 0.81, React 19, TypeScript
- **Supabase** — auth, Postgres DB, realtime subscriptions
- **AsyncStorage** — local persistence (unauthenticated users)

## Architecture

```
App.tsx
  AuthProvider        → AuthContext (Supabase session)
    SyncProvider      → SyncContext (picks LocalStorage or Supabase provider)
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
- `src/storage/` — SupabaseStorageProvider
- `src/types.ts` — ShoppingItem, ShoppingList, AppRoute
- `src/utils/` — recents helpers
- `supabase/` — config, migrations, edge functions

## Storage Invariants (do not break)

- **Never persist before hydration**: check `isHydrated` before saving
- **Storage keys are frozen**: `@shopping_lists` (lists), `@shopping_route` (current route)
- **Recents rules**: dedupe names, newest first, max 12 entries (`MAX_RECENTS`)
- **Lists sorted**: by `updatedAt` descending in UI; items by `createdAt` descending
- **Realtime guard**: `isFromRealtimeRef` prevents save loops on realtime updates

## Sharing / Auth Rules

- `ShoppingList.ownerId` — set when created by authenticated user
- `ShoppingList.shareCode` — short code for joining; falls back to list ID
- Owner-only actions: delete list, rename list
- Non-owner actions: leave list (removes from their view, not Supabase)
- `SyncContext` migrates local lists → Supabase on first sign-in, then clears local

## Patterns

- All list mutations go through `updateListById()` in `useShoppingListsApp`
- Items are deduped by normalized name (lowercase trim) within active items
- Use `showToast()` from `ToastContext` for user feedback
- `StorageProvider` interface: `loadLists`, `saveLists`, optional `subscribe`, `joinList`, `leaveList`, `deleteList`
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

## Skills

- `/feature` — implement or refactor app features while preserving invariants
- `/commit` — stage, commit with a good message, and push
- `/supabase` — work on Supabase migrations, RLS policies, or edge functions
