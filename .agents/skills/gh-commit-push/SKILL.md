---
name: gh-commit-push
description: Generate a high-quality commit message from current git changes, create the commit, and push to the active remote branch. Use when asked to finalize work and publish it to GitHub.
---

# GitHub Commit Push

1. Inspect changes:
   - `git status --short`
   - `git diff --staged`
   - If nothing is staged, stage intended files with `git add <paths>`.
2. Create a commit message from the actual diff:
   - subject in imperative mood, <= 72 chars
   - include scope when clear (example: `feat(storage): preserve recents order`)
3. Commit and push:
   - `git commit -m "<subject>"`
   - `git push`
4. Report:
   - commit hash
   - branch and remote pushed
   - short summary of committed changes

If push fails due to auth or upstream mismatch, report the exact blocking error and next required command.