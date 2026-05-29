# Archive Lists — Design Spec

**Date:** 2026-05-29

## Overview

Allow users to archive completed shopping lists. Archived lists are hidden from the main view but can be browsed and restored. Archive state is local-only (not synced to Supabase).

## Data Model

Add `isArchived?: boolean` to the `ShoppingList` type in `src/types.ts`.

- Absence (undefined) equals not archived — no migration needed for existing data
- Archiving sets `isArchived: true` and updates `updatedAt`
- Restoring sets `isArchived: false` and updates `updatedAt`
- All lists remain in the single `@shopping_lists` AsyncStorage key

## State & Mutations

In `useShoppingListsApp.ts`:

- `lists` (main screen) filters raw store to `!list.isArchived`
- `archivedLists` derived from same raw store, filtered to `isArchived === true`
- `archiveList(id)` — delegates to `updateListById`, sets `isArchived: true` + `updatedAt`
- `restoreList(id)` — delegates to `updateListById`, sets `isArchived: false` + `updatedAt`

No changes to SyncEngine, storage keys, or Supabase sync.

## List Screen UI

### Menu action
Add "Archive" to the existing options menu in `ShoppingListScreen` (alongside share and clear). When viewing an already-archived list, the option reads "Restore" instead — tapping calls `restoreList` and navigates back.

### Inline nudge
Rendered above the completed items section when `totalItems > 0 && uncheckedItems.length === 0` (all items checked, list not empty). Contains a short message and an "Archive" button. Tapping calls `archiveList` and navigates back to the lists screen.

## Archive Screen

New `src/screens/ArchiveScreen.tsx`, registered as `{ name: 'archive' }` in the `AppRoute` union in `src/types.ts`.

- **Entry point:** archive icon button in the lists screen header
- **Content:** renders `archivedLists` using the same list card style as `ListsScreen`
- **Navigation:** tapping a card opens `ShoppingListScreen` for that list; the "Restore" menu option handles restoring from there
- **Empty state:** displays `t('noArchivedLists')` message
- **Deletion:** not in scope (future addition)

## i18n

New keys in both `src/i18n/translations/en.ts` and `he.ts`:

| Key | English |
|-----|---------|
| `archiveList` | Archive List |
| `restoreList` | Restore |
| `archivedLists` | Archived Lists |
| `noArchivedLists` | No archived lists |
| `archiveNudgeText` | All done! Want to archive this list? |

All UI strings use `t('key')` from `useLocale()`. RTL layout handled automatically by `I18nManager.forceRTL()`.

## Testing

In `useShoppingListsApp` test file:

- `archiveList(id)` removes list from `lists`, adds it to `archivedLists`
- `restoreList(id)` removes list from `archivedLists`, adds it back to `lists`
