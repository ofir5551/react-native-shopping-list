# Add From Other Lists — Design Spec

**Date:** 2026-04-20  
**Status:** Approved

## Overview

When a user goes shopping and some items are out of stock, those items remain unchecked in their list. This feature lets them open any list, tap a FAB action, and pull in all unchecked items from their other lists — with all items pre-selected, so they only need to uncheck the ones they don't want.

## User Flow

1. User opens a shopping list (ShoppingListScreen).
2. User taps the FAB area, which expands to show existing actions (saved sets, from photo, voice, etc.) plus a new **"Add from other lists"** action.
3. A modal opens showing all unchecked items from every other list, grouped by source list name, with all items checked by default.
4. User unchecks any items they don't want.
5. User taps **"Add N"** (live count of selected items) to confirm.
6. Selected items are added to the current list. Original items in their source lists are unchanged.

## Entry Point

A new FAB action added to `CaretPopover` alongside the existing "saved sets", "from photo", and "voice" actions.

- **Icon**: `checkmark-done-outline` (Ionicons, matches the `keyof typeof Ionicons.glyphMap` type already used by `SpeedDialAction`)
- **i18n label / accessibility label**: `caret.addFromOtherLists` — follows the existing `caret.*` namespace pattern used by `caret.savedSets`, `caret.record`, `caret.fromPhoto`, `caret.aiSuggestions`. The `label` field in `SpeedDialAction` doubles as the accessibility label, consistent with all other actions.
- **`actionAnims` update required**: `CaretPopover.tsx` initialises `actionAnims` as a hardcoded array of 4 `Animated.Value`s. Adding this fifth action requires extending that array to 5 entries.

## Modal UI

```
┌─────────────────────────────┐
│  Add from other lists    X  │
│─────────────────────────────│
│  Weekly Shop                │
│  ☑ Milk                     │
│  ☑ Eggs                     │
│                             │
│  Costco                     │
│  ☑ Olive oil                │
│  ☑ Rice                     │
│─────────────────────────────│
│ [Unselect All]   [Add 4] →  │
└─────────────────────────────┘
```

- Items grouped by source list name (section headers, non-tappable).
- All items checked by default on open.
- Tapping a row toggles its checked state.
- Toggle button label: `addFromOtherLists.unselectAll` when everything is selected; `addFromOtherLists.selectAll` when anything is deselected.
- "Add N" button: label uses `addFromOtherLists.addCount` (see i18n table); disabled when selected count is 0.
- Empty state (no eligible items): display `addFromOtherLists.noItems`.

## Data Logic

### Sourcing and filtering
- Collect all `purchased: false` items from every list **except the current one**.
- Exclude any item whose name (lowercased + trimmed) already exists as an **active (unchecked)** item in the current list.
- Items that exist only as *completed* (purchased) items in the current list are **not** excluded — they may have been bought previously but are now out of stock in another list and eligible for re-import.

### Deduplication across source lists
- If the same item name (lowercased + trimmed) appears unchecked in multiple source lists, include it exactly once.
- Take the item from the **most recently updated** source list (highest `updatedAt` on the parent `ShoppingList`), so the most current quantity is used.

### Adding items
- The `onAdd` callback in the modal produces `{ name: string; quantity: number }[]`.
- The screen passes these to `handleQuickAddMultiple` (the same handler used by RecordModal, PhotoModal, SmartSuggestionsModal, SavedSetModal), then closes the modal. No toast is fired — this is consistent with every other caller of `handleQuickAddMultiple`, none of which show a toast.
- `id` and `createdAt` are generated inside `mergeItemsIntoList` as with every other multi-add flow. `mergeItemsIntoList` uses `'add'` quantity mode, meaning if a same-named item somehow slips through the pre-filter, its quantity is incremented rather than replaced.
- The existing normalised-name deduplication inside `mergeItemsIntoList` acts as a final safety net against race conditions between modal open and confirm.

## Props Threading

`ShoppingListScreen` currently has no access to all lists. The following threading is required:

1. Add `allLists: ShoppingList[]` to `ShoppingListScreenProps`.
2. In `HomeScreen`, pass `lists` (already available from `useShoppingListsApp`) as `allLists` to `ShoppingListScreen`.
3. `ShoppingListScreen` forwards `allLists` and `currentListId` to `AddFromOtherListsModal`.

## i18n Keys

All new keys live under the `addFromOtherLists` namespace.

| Key | English | Hebrew |
|-----|---------|--------|
| `caret.addFromOtherLists` | Add from other lists | הוסף מרשימות אחרות |
| `addFromOtherLists.selectAll` | Select All | בחר הכול |
| `addFromOtherLists.unselectAll` | Unselect All | בטל בחירת הכול |
| `addFromOtherLists.addCount` | Add {{count}} to List | הוסף {{count}} לרשימה |
| `addFromOtherLists.noItems` | No unchecked items in other lists | אין פריטים לא מסומנים ברשימות אחרות |

Add all keys to both `src/i18n/translations/en.ts` and `src/i18n/translations/he.ts`.

## Components

- **`AddFromOtherListsModal`** (`src/components/AddFromOtherListsModal.tsx`) — new modal component.
  - Props: `visible: boolean`, `currentListId: string`, `currentListItems: ShoppingItem[]`, `allLists: ShoppingList[]`, `onAdd(items: { name: string; quantity: number }[]): void`, `onClose(): void`
  - Owns selection state internally; resets to all-selected on each open.
- **`CaretPopover`** — add fifth speed-dial action; extend `actionAnims` from 4 to 5 entries.
- **`ShoppingListScreen`** — accept new `allLists` prop; add modal visibility state; wire up `onAdd` to call `handleQuickAddMultiple(items)` then close the modal (set visibility to false).
- **`HomeScreen`** — pass `lists` as `allLists` to `ShoppingListScreen`.

## Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| No other lists exist | Empty state in modal |
| All other lists have only purchased items | Empty state in modal |
| All unchecked items already active in current list | Empty state in modal |
| User unchecks all items | "Add 0" button is disabled |
| Same item name in multiple source lists | Shown once, taken from most recently updated list |
| Item exists only as completed in current list | Shown in modal (eligible for re-import) |

## Testing

- Pure-function unit test: deduplication + exclusion logic (given lists input → expected candidate array output).
- Unit test: "most recently updated" wins when same name spans multiple lists.
- Unit test: active items in current list are excluded; completed items are not.
- Component test for `AddFromOtherListsModal`: section headers render, row toggle updates count, "Add N" disables at 0, empty state renders.
- All existing tests must continue to pass.

## Out of Scope

- Modifying or deleting source items after copying — originals always unchanged.
- Filtering which lists to pull from — always all lists except current.
- Completed (purchased) items from source lists are never included.
