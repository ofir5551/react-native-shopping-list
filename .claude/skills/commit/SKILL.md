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
   - Format: `type(scope): short imperative description` (≤ 72 chars)
   - Types: `feat`, `fix`, `refactor`, `style`, `chore`, `docs`
   - Scope examples: `storage`, `sharing`, `ui`, `auth`, `supabase`
   - Body (optional): explain *why*, not *what*

4. **Commit and push**:
   ```
   git commit -m "$(cat <<'EOF'
   type(scope): description

   Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
   EOF
   )"
   git push
   ```

5. **Report**:
   - Commit hash and branch
   - One-line summary of what was committed
   - Any push errors (auth, upstream mismatch) with next required command

## Arguments

$ARGUMENTS
