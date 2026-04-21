# Implementation Plan: Add From Other Lists

**Spec:** `docs/superpowers/specs/2026-04-20-add-from-other-lists-design.md`  
**Branch:** `claude/brainstorm-unchecked-items-NSvbo`

---

## Step 1 — Add i18n keys

**Files:** `src/i18n/translations/en.ts`, `src/i18n/translations/he.ts`

In `en.ts`, add after the existing `caret.*` keys (after line 113):
```ts
'caret.addFromOtherLists': 'Add from other lists',
'addFromOtherLists.selectAll': 'Select All',
'addFromOtherLists.unselectAll': 'Unselect All',
'addFromOtherLists.addCount': 'Add {{count}} to List',
'addFromOtherLists.noItems': 'No unchecked items in other lists',
```

In `he.ts`, add the matching Hebrew translations:
```ts
'caret.addFromOtherLists': 'הוסף מרשימות אחרות',
'addFromOtherLists.selectAll': 'בחר הכול',
'addFromOtherLists.unselectAll': 'בטל בחירת הכול',
'addFromOtherLists.addCount': 'הוסף {{count}} לרשימה',
'addFromOtherLists.noItems': 'אין פריטים לא מסומנים ברשימות אחרות',
```

---

## Step 2 — Update CaretPopover

**File:** `src/components/CaretPopover.tsx`

### 2a. Add `onAddFromOtherLists` prop (lines 14-22)
Add to the props type:
```ts
onAddFromOtherLists: () => void;
```

### 2b. Extend `actionAnims` from 4 to 5 entries (lines 34-39)
```ts
const actionAnims = useRef([
  new Animated.Value(0),
  new Animated.Value(0),
  new Animated.Value(0),
  new Animated.Value(0),
  new Animated.Value(0),  // ← add this
]).current;
```

### 2c. Add the new action to the `actions` array (lines 41-46)
Append as the fifth entry:
```ts
{ icon: 'checkmark-done-outline', label: t('caret.addFromOtherLists'), onPress: onAddFromOtherLists },
```

---

## Step 3 — Create `AddFromOtherListsModal`

**File:** `src/components/AddFromOtherListsModal.tsx` (new file)

### Logic: `buildCandidates(currentListId, currentListItems, allLists)`
Pure function — extract to a helper so it can be unit tested independently.

```
1. Filter allLists to exclude the list with id === currentListId
2. Sort remaining lists by updatedAt descending (most recent first)
3. Build a Map<normalizedName, { name, quantity, listName }> iterating sorted lists:
   - normalized = name.toLowerCase().trim()
   - Only add to Map if not already present (first-wins = most recent list wins due to sort)
   - Only include items where purchased === false
4. Build activeNames = Set of normalized names from currentListItems where purchased === false
5. Filter Map entries: exclude any whose normalized name is in activeNames
6. Return array of { name, quantity, listName } grouped by listName
```

### Component structure
```tsx
type Props = {
  visible: boolean;
  currentListId: string;
  currentListItems: ShoppingItem[];
  allLists: ShoppingList[];
  onAdd: (items: { name: string; quantity: number }[]) => void;
  onClose: () => void;
};
```

Internal state:
- `selectedNames: Set<string>` — normalized names of selected items; initialized to all candidates on each open
- Reset selection when `visible` changes from false → true (use `useEffect` on `visible`)

UI elements:
- Modal header with title `t('caret.addFromOtherLists')` and close (X) button
- If no candidates: centered text `t('addFromOtherLists.noItems')`
- If candidates: `SectionList` with section = listName, each row = touchable checkbox row (item name + quantity if > 1)
- Footer row:
  - Toggle button: `t('addFromOtherLists.unselectAll')` if all selected, else `t('addFromOtherLists.selectAll')` — tapping toggles all
  - Confirm button: `t('addFromOtherLists.addCount', { count: selectedNames.size })`, disabled when `selectedNames.size === 0`
- On confirm: call `onAdd(selectedItems.map(i => ({ name: i.name, quantity: i.quantity })))` where `selectedItems` are candidates whose normalized name is in `selectedNames`

Style the modal to match existing modals in the codebase (e.g., SavedSetsModal, SmartSuggestionsModal) — use the same backdrop, container, and border-radius conventions.

---

## Step 4 — Update `ShoppingListScreen`

**File:** `src/screens/ShoppingListScreen.tsx`

### 4a. Add `allLists` to props type (line 30-67)
```ts
allLists: ShoppingList[];
```
Also import `ShoppingList` from `../types` if not already imported.

### 4b. Add modal visibility state
```ts
const [isAddFromOtherListsOpen, setIsAddFromOtherListsOpen] = useState(false);
```

### 4c. Wire up the `onAdd` handler
```ts
const handleAddFromOtherLists = (items: { name: string; quantity: number }[]) => {
  handleQuickAddMultiple(items);
  setIsAddFromOtherListsOpen(false);
};
```

### 4d. Pass `onAddFromOtherLists` to `CaretPopover` (lines 293-304)
```tsx
<CaretPopover
  onAiSuggestions={handleOpenAiSuggestions}
  onSavedSets={handleOpenSavedSetsList}
  onRecord={() => setIsRecordModalOpen(true)}
  onFromPhoto={() => setIsPhotoModalOpen(true)}
  onAddFromOtherLists={() => {
    setIsCaretOpen(false);
    setIsAddFromOtherListsOpen(true);
  }}
  onClose={() => setIsCaretOpen(false)}
/>
```

### 4e. Render `AddFromOtherListsModal`
Add alongside other modals (after existing modal JSX):
```tsx
<AddFromOtherListsModal
  visible={isAddFromOtherListsOpen}
  currentListId={listId}
  currentListItems={[...activeItems, ...completedItems]}
  allLists={allLists}
  onAdd={handleAddFromOtherLists}
  onClose={() => setIsAddFromOtherListsOpen(false)}
/>
```

### 4f. Import `AddFromOtherListsModal`
```ts
import AddFromOtherListsModal from '../components/AddFromOtherListsModal';
```

---

## Step 5 — Update `HomeScreen`

**File:** `src/screens/HomeScreen.tsx`

Pass `lists` as `allLists` to `ShoppingListScreen` (after existing props, around line 172):
```tsx
allLists={lists}
```

---

## Step 6 — Write Tests

### 6a. Unit tests for `buildCandidates` (new file or co-located with modal)
**File:** `src/components/AddFromOtherListsModal.test.ts`

Test cases:
1. **Basic case**: items from other lists appear as candidates
2. **Excludes current list**: items from `currentListId` are never included
3. **Excludes active items in current list**: unchecked item in current list → excluded from candidates
4. **Does not exclude completed items in current list**: purchased item in current list → still appears
5. **Deduplication — most recent wins**: same name in two lists → item from list with higher `updatedAt` is used (correct quantity)
6. **Deduplication — older list loses**: item from older list is not present
7. **Empty result**: all candidates filtered out → returns empty array
8. **Quantity carried over**: candidate quantity matches source item quantity

### 6b. Component tests for `AddFromOtherListsModal`
Test cases:
1. Renders section headers (list names)
2. All items checked by default
3. Tapping a row unchecks it; count updates
4. "Unselect All" unchecks everything; button label flips to "Select All"
5. "Select All" re-checks everything
6. Confirm button disabled when count = 0
7. Confirm button calls `onAdd` with correct `{ name, quantity }[]`
8. Empty state renders `noItems` message when no candidates

---

## Step 7 — Run Tests

```
npm test
```

All tests must pass before committing.

---

## Step 8 — Verify RTL

Toggle language to Hebrew in Settings. Check:
- FAB action label renders correctly in RTL
- Modal header, section headers, rows, and buttons all lay out correctly
- Checkbox alignment is correct in RTL

---

## Commit

```
feat: add "Add from other lists" FAB action to shopping list screen
```
