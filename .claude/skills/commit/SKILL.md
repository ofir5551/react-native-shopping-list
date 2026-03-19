---
name: commit
description: Stage relevant changes, write a high-quality conventional commit message from the actual diff, commit, and push. Use when asked to finalize and publish work.
---

# Commit & Push

1. **Inspect** current state:
   ```
   git status --short
   git diff --staged
   git diff
   ```

2. **Stage** only relevant files. Avoid `.env`, secrets, or build artifacts.

3. **Write the commit message**:
   - Format: `type(scope): short imperative description`
   - **Maximum 20 words total** (subject + body combined). No body unless essential.
   - Types: `feat`, `fix`, `refactor`, `style`, `chore`, `docs`
   - Scope examples: `storage`, `sharing`, `ui`, `auth`, `supabase`

4. **Commit and push**:
   ```
   git commit -m "type(scope): description"
   git push
   ```
   - **Never** add `Co-Authored-By` or any trailer lines to the commit message.

5. **Report**:
   - Commit hash and branch
   - One-line summary of what was committed
   - Any push errors (auth, upstream mismatch) with next required command

## Arguments

$ARGUMENTS
