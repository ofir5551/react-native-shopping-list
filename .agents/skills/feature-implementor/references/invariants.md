Core invariants:
- Never persist items before hydration completes.
- Keep storage keys unchanged:
  - `@shopping_list_items`
  - `@shopping_list_recent`
- Keep recents logic unchanged:
  - dedupe names
  - newest first
  - max 12 entries
- Keep derived list sorting by `createdAt` newest-first.