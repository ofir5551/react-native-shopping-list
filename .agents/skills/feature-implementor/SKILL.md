---
name: feature-implementor
description: Implement and refactor features in this Expo + React Native + TypeScript shopping-list app. Use when changing components, hooks, styles, or storage behavior while preserving app invariants.
---

# Feature Implementor

1. Read `references/invariants.md` before editing app behavior.
2. Implement the smallest safe change that solves the request.
3. Keep logic centralized in existing hooks/components instead of adding parallel state paths.
4. Validate with available commands:
   - `npm run web`
   - `npm start`
5. Report:
   - files changed
   - behavior change
   - risks or follow-up checks