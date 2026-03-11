# Offline-First Architecture: Local-First with Cloud Sync

## Context

When Supabase is down or unreachable, the app crashes with unhandled errors on startup because authenticated users load data exclusively from Supabase (`SupabaseStorageProvider`). There's no local cache, no error handling on `getSession()`, and no fallback. The fix is to make **AsyncStorage the primary data store for all users** and treat Supabase as a background sync target. Users should never notice whether Supabase is up or down.

## Architecture Change

```
CURRENT:  Unauth → LocalStorage | Auth → SupabaseOnly
NEW:      Always → LocalStorage (primary) + SyncEngine (background, auth only)
```

---

## Files to Create

### 1. `src/sync/SupabaseApiClient.ts` — Thin Supabase API wrapper

Extracted from current `SupabaseStorageProvider.ts`. Same logic, different shape (not a `StorageProvider`).

```typescript
class SupabaseApiClient {
  constructor(private userId: string)

  async fetchLists(): Promise<ShoppingList[]>             // current loadLists() logic
  async upsertList(list: ShoppingList): Promise<void>     // single list upsert (owned vs shared)
  async deleteList(listId: string): Promise<void>         // current deleteList()
  async joinList(shareCode: string): Promise<void>        // current joinList()
  async leaveList(listId: string): Promise<void>          // current leaveList()
  subscribeRealtime(onEvent: () => void): () => void      // current subscribe() but just triggers refetch
}
```

Key difference from `SupabaseStorageProvider.saveLists()`: `upsertList` handles **one list at a time** (the SyncEngine calls it per dirty ID), preserving the owned-vs-shared upsert/update logic.

### 2. `src/sync/SyncEngine.ts` — Core sync orchestrator

Responsibilities:
- On `start()`: pull from Supabase, merge with local, subscribe to realtime
- On `onLocalSave(lists)`: mark changed lists as dirty, attempt push
- On realtime event: refetch from Supabase, merge into local, call `onRemoteUpdate` callback
- On failed push: retry with exponential backoff (2s, 4s, 8s... 30s); successful push flushes remaining queue
- Persist dirty queue in AsyncStorage so pending syncs survive app restart

```typescript
class SyncEngine {
  private userId: string;
  private apiClient: SupabaseApiClient;
  private dirtyIds: Set<string>;
  private pendingDeletes: string[];
  private isMergingRemote: boolean;  // prevents re-push during remote merge
  private retryTimer: ReturnType<typeof setTimeout> | null;
  private onRemoteUpdate: (lists: ShoppingList[]) => void;
  private unsubRealtime?: () => void;

  constructor(userId, apiClient, onRemoteUpdate)

  async start(): void          // load queue, initial sync, subscribe realtime
  stop(): void                 // unsubscribe realtime, cancel retry timers

  async onLocalSave(lists: ShoppingList[]): void  // skip if isMergingRemote; mark dirty; try push
  async deleteList(listId: string): void           // push to server or queue
  async leaveList(listId: string): void            // online-only, throw if offline
  async joinList(shareCode: string): void          // online-only, throw if offline

  // Internal
  private async initialSync(): void
  private mergeLists(serverLists, localLists): ShoppingList[]  // see merge rules below
  private async pushDirty(): void
  private async pushSingleList(list: ShoppingList): boolean
  private handleRealtimeUpdate(): void
  private async persistQueue(): void     // save dirtyIds + pendingDeletes to AsyncStorage
  private async loadQueue(): void
  private scheduleRetry(): void          // exponential backoff: 2s, 4s, 8s... max 30s
}
```

**Merge rules** (`mergeLists`):
- Server list exists, no local version → add to local (new shared list from another device)
- Both exist, `server.updatedAt > local.updatedAt` → use server version
- Both exist, `local.updatedAt >= server.updatedAt` → keep local, mark dirty
- Local list not on server + `ownerId === userId` → keep, mark dirty (new local list)
- Local list not on server + `ownerId !== userId` → remove (shared list deleted by owner)
- Local list not on server + no `ownerId` → keep, mark dirty (pre-auth local list needing upload)

**AsyncStorage keys** (new, additive):
- `@sync_dirty_ids` — JSON array of list IDs pending push
- `@sync_pending_deletes` — JSON array of list IDs pending server deletion

---

## Files to Modify

### 3. `src/supabase.ts` — Add resilient fetch wrapper

Wrap the global `fetch` passed to the Supabase client so network errors (e.g. `ERR_NAME_NOT_RESOLVED`) are caught and returned as synthetic error responses rather than thrown as uncaught exceptions. This prevents the SDK's internal auto-refresh retries from flooding the console with errors when offline.

```typescript
const resilientFetch: typeof fetch = async (input, init) => {
    try {
        return await fetch(input, init);
    } catch (err) {
        console.warn('Supabase fetch failed (offline?):', (err as Error).message);
        return new Response(JSON.stringify({ error: 'network_error', message: 'Network request failed' }), {
            status: 0,
            statusText: 'Network Error',
            headers: new Headers({ 'Content-Type': 'application/json' }),
        });
    }
};

// Pass to createClient:
// global: { fetch: resilientFetch }
```

### 4. `src/context/AuthContext.tsx` — Add error handling

Add `.catch()` to `getSession()`:
```typescript
supabase.auth.getSession()
  .then(({ data: { session } }) => {
    setSession(session);
    setUser(session?.user ?? null);
    setIsLoading(false);
  })
  .catch(() => {
    // Supabase unreachable — continue as unauthenticated
    setIsLoading(false);
  });
```

This prevents the app from hanging forever when Supabase is down.

### 5. `src/context/SyncContext.tsx` — Major rewrite

**Always use `LocalStorageProvider`** as the primary storage. For authenticated users, create a `SyncEngine` that syncs in the background.

New context type:
```typescript
type SyncContextType = {
  storageProvider: StorageProvider;  // always a wrapped LocalStorageProvider
  isInitializing: boolean;
  joinList: (shareCode: string) => Promise<void>;
  leaveList: (listId: string) => Promise<void>;
  deleteListFromServer: (listId: string) => Promise<void>;
};
```

**Wrapped provider pattern** — SyncContext creates a wrapper around `LocalStorageProvider` that intercepts `saveLists` to notify the SyncEngine:

```typescript
const wrappedProvider: StorageProvider = {
  loadLists: () => LocalStorageProvider.loadLists(),
  saveLists: async (lists) => {
    await LocalStorageProvider.saveLists(lists);
    syncEngineRef.current?.onLocalSave(lists);
  },
  subscribe: (onChange) => {
    // Delegate to SyncEngine's remote update mechanism
    remoteUpdateCallbackRef.current = onChange;
    return () => { remoteUpdateCallbackRef.current = null; };
  },
};
```

**SyncEngine lifecycle**: `useEffect` on `user` change:
- If user is set: create `SupabaseApiClient(user.id)` + `SyncEngine(...)`, call `start()`
- On cleanup: call `stop()`
- The `onRemoteUpdate` callback: saves merged lists to `LocalStorageProvider`, then calls the `subscribe` callback (which triggers `useShoppingListsApp`'s realtime handler with `isFromRealtimeRef`)

**Migration removal**: The old "load local → push to cloud → clear local" migration is no longer needed. Local data IS the primary store now. The SyncEngine's `initialSync()` naturally merges local and server data.

### 6. `src/hooks/useShoppingListsApp.ts` — Minimal changes

Three functions need to delegate through `SyncContext` instead of `storageProvider`:

**a. `deleteList`**:
```typescript
// Before: storageProvider.deleteList?.(listId);
// After:
const { deleteListFromServer } = useSync();
// ... in deleteList():
deleteListFromServer(listId);  // fire-and-forget, SyncEngine handles offline
```

**b. `leaveList`**:
```typescript
// Before: await storageProvider.leaveList(listId);
// After:
const { leaveList: leaveListOnServer } = useSync();
// ... in leaveList():
await leaveListOnServer(listId);  // throws if offline → caught by existing try/catch
```

**c. `submitListName` join mode**:
```typescript
// Before: await storageProvider.joinList(trimmed); const updatedLists = await storageProvider.loadLists();
// After:
const { joinList: joinListOnServer } = useSync();
// ... in submitListName():
await joinListOnServer(trimmed);  // SyncEngine handles adding to local
const updatedLists = await storageProvider.loadLists();  // reads from local (now has the joined list)
```

Everything else in this file stays the same. The save effect writes to the wrapped `LocalStorageProvider`, which transparently notifies the SyncEngine. The `subscribe`/`isFromRealtimeRef` pattern works unchanged via the wrapped provider.

### 7. Delete `src/storage/SupabaseStorageProvider.ts`

Replaced by `src/sync/SupabaseApiClient.ts`. Remove the import from `SyncContext.tsx`.

---

## Implementation Order

### Phase 1: Foundation
1. Create `src/sync/SupabaseApiClient.ts` — extract from `SupabaseStorageProvider.ts`

### Phase 2: SyncEngine
2. Create `src/sync/SyncEngine.ts` — merge logic, queue management, realtime, retry with backoff

### Phase 3: Integration
3. Add resilient fetch wrapper to `src/supabase.ts`
4. Fix `src/context/AuthContext.tsx` — add `.catch()` to `getSession()`
5. Rewrite `src/context/SyncContext.tsx` — always LocalStorage + SyncEngine for auth users
6. Update `src/hooks/useShoppingListsApp.ts` — delegate join/leave/delete through SyncContext

### Phase 4: Cleanup
7. Delete `src/storage/SupabaseStorageProvider.ts`

---

## Error Handling Summary

| Scenario | Behavior |
|---|---|
| Supabase unreachable on app start | Auth catches error → app loads from local data instantly |
| Push fails | List ID stays in `dirtyIds`, retried with exponential backoff |
| Realtime disconnects | Supabase SDK auto-reconnects; SyncEngine does full pull+merge on reconnect |
| Join list while offline | Toast: "You need to be online to join a list" |
| Leave list while offline | Toast: "You need to be online to leave a list" |
| Delete list while offline | Remove from local immediately, queue server delete |
| SDK auto-refresh fails | `resilientFetch` catches network error, returns synthetic response — no console spam |

## Key Invariants Preserved

- `@shopping_lists` and `@shopping_route` keys unchanged
- `isFromRealtimeRef` pattern preserved via wrapped provider's `subscribe`
- `isHydrated` guard preserved — never persist before hydration
- Recents sanitization unchanged
- Owner-only delete/rename semantics unchanged
- `updateListById` pattern unchanged

## Verification

1. **Offline cold start**: Kill network, start app → lists load from local, no errors, no spinner hang
2. **Offline mutations**: Add/edit/delete items while offline → changes persist locally
3. **Reconnect sync**: Re-enable network → dirty lists pushed to Supabase, server changes pulled
4. **Realtime**: Edit on device A → appears on device B (when both online)
5. **Join/leave offline**: Attempt join → toast error. Attempt leave → toast error
6. **Delete offline**: Delete list → removed locally, server delete queued
7. **Fresh auth user**: Sign in for first time → SyncEngine pulls server lists into local
8. **Existing local data + sign in**: Local lists merge with server lists correctly
9. **No console spam**: When offline, no uncaught `TypeError: Failed to fetch` errors
10. Run full manual test checklist from CLAUDE.md
