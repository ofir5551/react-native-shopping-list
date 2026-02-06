# Shopping List - Copilot Instructions

Quick guidance for contributors.

## Architecture
- Expo + React Native + TypeScript app.
- Main state and behaviors live in `src/hooks/useShoppingListsApp.ts`.
- Async persistence lives in `src/storage.ts`.

## Invariants
- Do not persist before hydration completes.
- Keep storage keys: `@shopping_list_items`, `@shopping_list_recent`.
- Keep recents: dedupe + newest-first + max 12.

## Primary Files
- `src/hooks/useShoppingListsApp.ts`
- `src/storage.ts`
- `src/utils/recents.ts`
- `src/components/OverlayModal.tsx`
- `src/components/ItemRow.tsx`

## Commands
```bash
npm start
npm run web
npm run android
npm run ios
```