---
name: playwright-test-runner
description: Run extensive Playwright-based browser validation for this app. Use when the task requires broad UI-flow, regression, and smoke testing with repeatable steps and clear failure artifacts.
---

# Playwright Test Runner

1. Ensure dependencies are available:
   - `npx playwright --version`
2. If Playwright is missing, install project-scoped tooling:
   - `npm i -D @playwright/test`
   - `npx playwright install`
3. Run broad validation against web app flows, preferring headed mode when debugging:
   - `npx playwright test`
   - `npx playwright test --project=chromium`
   - `npx playwright test --retries=2`
4. For manual exploratory coverage, use Playwright CLI flows and capture screenshots/traces.
5. Always report:
   - failing scenarios
   - likely root cause
   - artifact paths (screenshots/traces/videos)

Read `references/test-matrix.md` before large test passes.