# Shopping List - Copilot Instructions

## Project Overview

Shopping List is a React Native + Expo mobile app built with TypeScript. It provides a simple, fast shopping list manager with persistent storage using AsyncStorage and a modal-based UI for adding items with recent item suggestions.

**Tech Stack:** React Native 0.81, Expo 54, React 19, AsyncStorage 2.2, TypeScript 5.9

## Architecture

### Data Flow
1. **State Management:** Single custom hook `useShoppingList()` in [src/hooks/useShoppingList.ts](src/hooks/useShoppingList.ts) manages all app state
2. **Persistence:** [src/storage.ts](src/storage.ts) handles AsyncStorage read/write with try-catch error silencing (designed for prototype reliability)
3. **Types:** Core data model is `ShoppingItem` with `id`, `name`, `purchased` boolean, and `createdAt` timestamp ([src/types.ts](src/types.ts))
4. **Recents Cache:** Separate parallel storage tracks up to 12 recent item names for quick-add suggestions ([src/utils/recents.ts](src/utils/recents.ts))

### Component Tree
```
HomeScreen (screens/)
├── Header (components/)
├── ShoppingList (components/) - FlatList wrapper
│   ├── ItemRow (components/) - active items
│   └── CompletedSection (components/)
│       └── ItemRow (components/) - completed items
├── EmptyState (components/)
├── Fab (components/) - trigger overlay
└── OverlayModal (components/)
    ├── Input field
    └── Recent items tags
```

## Critical Patterns

### State Hydration Pattern
- `useShoppingList()` uses `isHydrated` flag to prevent writes before AsyncStorage loads
- Effects only save after `isHydrated === true` to avoid data loss
- Mount check (`isMounted` flag) prevents state updates if component unmounts during async load

### Item Sorting & Memoization
- `activeItems` and `completedItems` sorted by `createdAt` (newest first) inside `useMemo()`
- Call this when modifying items array - memoization prevents unnecessary re-renders

### Recents Management
- `handleOverlayAdd()` calls `handleAddSelected()` which updates recents via `setRecentItems()`
- `sanitizeRecents()` deduplicates and caps at `MAX_RECENTS=12` (also called on hydration)
- Recents stored separately from items - allows quick suggestions without item list overhead

## Development Workflows

### Start Development
```bash
npm start              # Start Expo server
npm run android        # Run on Android emulator
npm run ios            # Run on iOS simulator
npm run web            # Run in browser
```

### Code Structure Rules
- **Hooks:** Only `useShoppingList()` custom hook - prefer it for all state needs
- **Styles:** Centralized in [src/styles/appStyles.ts](src/styles/appStyles.ts) - keep StyleSheets here
- **Components:** Functional, receive props, call `useShoppingList()` only in `HomeScreen`
- **Keyboard:** Use `Keyboard.dismiss()` from React Native after adding items

### Storage Behaviors
- `loadItems()` and `loadRecents()` return empty arrays if parsing fails (no exceptions thrown)
- `saveItems()` and `saveRecents()` silently ignore write errors (prototype design choice)
- Keys: `@shopping_list_items` and `@shopping_list_recent` - don't change without migration

## Key Implementation Details

### Adding Items Flow
1. User types in OverlayModal `overlayInput`
2. Presses button → `handleOverlayAdd()` runs:
   - Trims and validates input
   - Updates `recentItems` (prepends, deduplicates, slices to 12)
   - Sets `selectedRecent` if not already there
   - Clears input and dismisses keyboard
3. User selects multiple recents, presses "Add All" → `handleAddSelected()`:
   - Creates new items with `Date.now()` timestamps (staggered by 1ms per item)
   - Sets items in state
   - Closes overlay
4. Effect watches `items` → saves to AsyncStorage

### Completed Items Section
- Collapsible section toggled by `showCompleted` state
- Only renders if `completedItems.length > 0`
- Uses same `ItemRow` component as active items

## References
- [HomeScreen component](src/screens/HomeScreen.tsx) - wires everything together
- [useShoppingList hook](src/hooks/useShoppingList.ts) - all state and handlers
- [Storage layer](src/storage.ts) - AsyncStorage abstraction
- [Styles](src/styles/appStyles.ts) - centralized StyleSheets
