import AsyncStorage from '@react-native-async-storage/async-storage';
import { ShoppingList } from '../types';
import { SupabaseApiClient } from './SupabaseApiClient';
import { LocalStorageProvider } from '../storage';

const DIRTY_IDS_KEY = '@sync_dirty_ids';
export const PENDING_DELETES_KEY = '@sync_pending_deletes';
const MAX_RETRY_DELAY = 30000;
const INITIAL_RETRY_DELAY = 2000;

export class SyncEngine {
    private dirtyIds = new Set<string>();
    private pendingDeletes: string[] = [];
    private isMergingRemote = false;
    private retryTimer: ReturnType<typeof setTimeout> | null = null;
    private retryDelay = INITIAL_RETRY_DELAY;
    private unsubRealtime?: () => void;
    private stopped = false;

    constructor(
        private userId: string,
        private apiClient: SupabaseApiClient,
        private onRemoteUpdate: (lists: ShoppingList[]) => void,
    ) { }

    async start(): Promise<void> {
        this.stopped = false;
        await this.loadQueue();

        try {
            await this.initialSync();
        } catch (err) {
            console.warn('SyncEngine: initial sync failed, will retry', err);
            this.scheduleRetry();
        }

        this.unsubRealtime = this.apiClient.subscribeRealtime(() => {
            this.handleRealtimeUpdate();
        });
    }

    stop(): void {
        this.stopped = true;
        if (this.unsubRealtime) {
            this.unsubRealtime();
            this.unsubRealtime = undefined;
        }
        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
            this.retryTimer = null;
        }
    }

    async onLocalSave(lists: ShoppingList[]): Promise<void> {
        if (this.isMergingRemote) return;

        // Determine which lists changed by comparing with what's in local storage
        // Since we're called after save, all lists are candidates.
        // Mark all lists as dirty (the push will handle deduplication)
        for (const list of lists) {
            this.dirtyIds.add(list.id);
        }
        await this.persistQueue();
        this.tryPush();
    }

    async deleteList(listId: string): Promise<void> {
        // Try to push immediately; queue if offline
        try {
            await this.apiClient.deleteList(listId);
        } catch {
            this.pendingDeletes.push(listId);
            await this.persistQueue();
            this.scheduleRetry();
        }
        // Remove from dirty since it's deleted
        this.dirtyIds.delete(listId);
        await this.persistQueue();
    }

    async leaveList(listId: string): Promise<void> {
        // Online-only operation
        await this.apiClient.leaveList(listId);
    }

    async joinList(shareCode: string): Promise<void> {
        // Online-only: join on server, then pull the new list into local
        await this.apiClient.joinList(shareCode);

        // Fetch updated lists from server and merge into local
        try {
            const serverLists = await this.apiClient.fetchLists();
            const localLists = await LocalStorageProvider.loadLists();
            const merged = this.mergeLists(serverLists, localLists);

            this.isMergingRemote = true;
            await LocalStorageProvider.saveLists(merged);
            this.onRemoteUpdate(merged);
            this.isMergingRemote = false;
        } catch (err) {
            this.isMergingRemote = false;
            console.warn('SyncEngine: post-join sync failed', err);
        }
    }

    // --- Internal ---

    private async initialSync(): Promise<void> {
        const serverLists = await this.apiClient.fetchLists();
        const localLists = await LocalStorageProvider.loadLists();
        const pendingDeleteSet = new Set(this.pendingDeletes);
        const merged = this.mergeLists(serverLists, localLists)
            .filter(l => !pendingDeleteSet.has(l.id));

        this.isMergingRemote = true;
        await LocalStorageProvider.saveLists(merged);
        this.onRemoteUpdate(merged);
        this.isMergingRemote = false;

        // Reset retry delay on successful sync
        this.retryDelay = INITIAL_RETRY_DELAY;

        // Push any remaining dirty lists and pending deletes
        await this.pushDirty();
        await this.pushPendingDeletes();
    }

    private mergeLists(serverLists: ShoppingList[], localLists: ShoppingList[]): ShoppingList[] {
        const serverMap = new Map(serverLists.map(l => [l.id, l]));
        const localMap = new Map(localLists.map(l => [l.id, l]));
        const merged: ShoppingList[] = [];

        // Process server lists
        for (const serverList of serverLists) {
            const localList = localMap.get(serverList.id);
            if (!localList) {
                // Server list with no local version → new shared list from another device
                merged.push(serverList);
            } else if (serverList.updatedAt > localList.updatedAt) {
                // Server is newer → use server version
                merged.push(serverList);
            } else {
                // Local is newer or same → keep local, mark dirty
                merged.push(localList);
                if (localList.updatedAt > serverList.updatedAt) {
                    this.dirtyIds.add(localList.id);
                }
            }
        }

        // Process local-only lists
        for (const localList of localLists) {
            if (serverMap.has(localList.id)) continue; // Already handled

            if (localList.ownerId === this.userId || !localList.ownerId) {
                // Own list or pre-auth list not yet on server → keep and push
                merged.push(localList);
                this.dirtyIds.add(localList.id);
            }
            // else: shared list not on server = deleted by owner → drop it
        }

        return merged;
    }

    private async tryPush(): Promise<void> {
        if (this.stopped) return;
        try {
            await this.pushDirty();
            await this.pushPendingDeletes();
            // Success — reset retry delay
            this.retryDelay = INITIAL_RETRY_DELAY;
        } catch {
            this.scheduleRetry();
        }
    }

    private async pushDirty(): Promise<void> {
        if (this.dirtyIds.size === 0) return;

        const localLists = await LocalStorageProvider.loadLists();
        const localMap = new Map(localLists.map(l => [l.id, l]));
        const failedIds: string[] = [];

        for (const id of this.dirtyIds) {
            const list = localMap.get(id);
            if (!list) {
                // List was deleted locally, no need to push
                continue;
            }
            try {
                await this.apiClient.upsertList(list);
            } catch {
                failedIds.push(id);
            }
        }

        this.dirtyIds = new Set(failedIds);
        await this.persistQueue();

        if (failedIds.length > 0) {
            throw new Error('Some lists failed to push');
        }
    }

    private async pushPendingDeletes(): Promise<void> {
        if (this.pendingDeletes.length === 0) return;

        const remaining: string[] = [];
        for (const id of this.pendingDeletes) {
            try {
                await this.apiClient.deleteList(id);
            } catch {
                remaining.push(id);
            }
        }

        this.pendingDeletes = remaining;
        await this.persistQueue();

        if (remaining.length > 0) {
            throw new Error('Some deletes failed to push');
        }
    }

    private async handleRealtimeUpdate(): Promise<void> {
        if (this.stopped) return;
        try {
            const serverLists = await this.apiClient.fetchLists();
            const localLists = await LocalStorageProvider.loadLists();
            const merged = this.mergeLists(serverLists, localLists);

            this.isMergingRemote = true;
            await LocalStorageProvider.saveLists(merged);
            this.onRemoteUpdate(merged);
            this.isMergingRemote = false;
        } catch (err) {
            this.isMergingRemote = false;
            console.warn('SyncEngine: realtime refetch failed', err);
        }
    }

    private async persistQueue(): Promise<void> {
        try {
            await AsyncStorage.setItem(DIRTY_IDS_KEY, JSON.stringify([...this.dirtyIds]));
            await AsyncStorage.setItem(PENDING_DELETES_KEY, JSON.stringify(this.pendingDeletes));
        } catch {
            // Ignore storage errors
        }
    }

    private async loadQueue(): Promise<void> {
        try {
            const dirtyRaw = await AsyncStorage.getItem(DIRTY_IDS_KEY);
            if (dirtyRaw) {
                const parsed = JSON.parse(dirtyRaw);
                if (Array.isArray(parsed)) {
                    this.dirtyIds = new Set(parsed);
                }
            }
            const deletesRaw = await AsyncStorage.getItem(PENDING_DELETES_KEY);
            if (deletesRaw) {
                const parsed = JSON.parse(deletesRaw);
                if (Array.isArray(parsed)) {
                    this.pendingDeletes = parsed;
                }
            }
        } catch {
            // Start with empty queues on error
        }
    }

    private scheduleRetry(): void {
        if (this.stopped || this.retryTimer) return;

        this.retryTimer = setTimeout(async () => {
            this.retryTimer = null;
            if (this.stopped) return;

            try {
                await this.pushDirty();
                await this.pushPendingDeletes();
                this.retryDelay = INITIAL_RETRY_DELAY;
            } catch {
                this.retryDelay = Math.min(this.retryDelay * 2, MAX_RETRY_DELAY);
                this.scheduleRetry();
            }
        }, this.retryDelay);
    }
}
