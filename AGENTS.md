# Shopping List Agents

This repo keeps a minimal local agent setup under `.agents/skills`.

## Project Invariants
- Keep hydration guard behavior: do not persist until hydration is complete.
- Keep storage keys stable: `@shopping_list_items` and `@shopping_list_recent`.
- Keep recents behavior stable: dedupe names, prepend newest, cap at 12.

## Skills
- `$feature-implementor`: implement app features and refactors in Expo/React Native/TypeScript while preserving invariants.
- `$playwright-test-runner`: run extensive Playwright browser tests for app flows and report failures with artifacts.
- `$gh-commit-push`: generate a clear commit message from staged changes, commit, and push with `git`/`gh`.

## Routing
- Use `$feature-implementor` for product code changes.
- Use `$playwright-test-runner` for validation and regression checks.
- Use `$gh-commit-push` when asked to finalize and push changes.