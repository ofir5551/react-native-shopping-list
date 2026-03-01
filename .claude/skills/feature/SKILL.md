---
name: feature
description: Implement or refactor features in this Expo + React Native + TypeScript shopping list app. Use when changing components, hooks, screens, storage behavior, or context providers. Preserves storage invariants.
---

# Feature Implementor

## Before writing any code

1. Read `CLAUDE.md` for current architecture and invariants.
2. Read the relevant existing file(s) — never modify code you haven't read.
3. Identify the narrowest change that solves the request.

## Implementation rules

- **All list mutations** go through `updateListById()` in `src/hooks/useShoppingListsApp.ts`.
- **Never bypass hydration guard**: only persist after `isHydrated` is true.
- **Storage keys are frozen**: `@shopping_lists` and `@shopping_route`.
- **Recents**: dedupe names (normalized), newest first, cap at `MAX_RECENTS` (12).
- **Items deduped** by normalized name (lowercase + trim) among active items.
- Keep logic in existing hooks/contexts rather than adding parallel state.
- New UI components → `src/components/`; new screens → `src/screens/`.
- Use `showToast()` from `ToastContext` for user-visible feedback.
- Owner-only actions (delete, rename) must check `currentUserId === list.ownerId`.

## Argument

$ARGUMENTS

## Deliver

- List every file changed with a one-line description of what changed.
- Note any invariants touched and how they were preserved.
- Flag risks or follow-up items if any.
