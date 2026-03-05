import { Platform } from 'react-native';
import { StorageProvider } from '../storage';
import { ShoppingList } from '../types';
import { loadQueue, saveToQueue, clearQueue } from './offlineQueue';

const FLUSH_INTERVAL_MS = 30_000;

type StatusCallback = (isOnline: boolean, hasPendingSync: boolean) => void;

/**
 * Wraps any StorageProvider with offline-queue behaviour.
 *
 * When saveLists() fails (e.g. network down), the latest list state is
 * persisted to AsyncStorage.  On reconnect—detected via browser
 * online/offline events (web) or a periodic 30 s heartbeat (all
 * platforms)—the queue is flushed automatically.
 *
 * Callers can subscribe to status changes via onStatusChange().
 */
export class OfflineQueuedStorageProvider implements StorageProvider {
  private inner: StorageProvider;
  private _isOnline = true;
  private _hasPendingSync = false;
  private isFlushing = false;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private unsubscribeWebEvents: (() => void) | null = null;
  private statusListeners: Set<StatusCallback> = new Set();

  constructor(inner: StorageProvider) {
    this.inner = inner;
    this.init();
  }

  private async init() {
    // Check for a queue left over from a previous session
    const queued = await loadQueue();
    if (queued) {
      this._hasPendingSync = true;
      this.notify();
      // Attempt to flush immediately on startup
      this.flushQueue();
    }

    // Web: browser online/offline events
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const onOnline = () => {
        this._isOnline = true;
        this.notify();
        this.flushQueue();
      };
      const onOffline = () => {
        this._isOnline = false;
        this.notify();
      };
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
      this.unsubscribeWebEvents = () => {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
      };
    }

    // Periodic retry covers React Native native and acts as a safety-net on web
    this.flushTimer = setInterval(() => this.flushQueue(), FLUSH_INTERVAL_MS);
  }

  /** Call when the provider is no longer needed (e.g. user signs out). */
  destroy() {
    if (this.flushTimer !== null) clearInterval(this.flushTimer);
    if (this.unsubscribeWebEvents) this.unsubscribeWebEvents();
  }

  get isOnline() {
    return this._isOnline;
  }

  get hasPendingSync() {
    return this._hasPendingSync;
  }

  onStatusChange(cb: StatusCallback): () => void {
    this.statusListeners.add(cb);
    return () => this.statusListeners.delete(cb);
  }

  private notify() {
    this.statusListeners.forEach((cb) => cb(this._isOnline, this._hasPendingSync));
  }

  // ── StorageProvider interface ──────────────────────────────────────────────

  async loadLists(): Promise<ShoppingList[]> {
    return this.inner.loadLists();
  }

  async saveLists(lists: ShoppingList[]): Promise<void> {
    try {
      await this.inner.saveLists(lists);
      // Success: clear any pending queue
      if (this._hasPendingSync) {
        await clearQueue();
        this._hasPendingSync = false;
      }
      if (!this._isOnline) {
        this._isOnline = true;
      }
      this.notify();
    } catch {
      // Network (or other transient) failure — queue the latest state
      await saveToQueue(lists);
      this._hasPendingSync = true;
      this._isOnline = false;
      this.notify();
    }
  }

  subscribe(onChange: (lists: ShoppingList[]) => void): () => void {
    if (!this.inner.subscribe) return () => {};
    return this.inner.subscribe((lists) => {
      // A successful realtime push means we're back online
      if (!this._isOnline) {
        this._isOnline = true;
        this.notify();
        this.flushQueue();
      }
      onChange(lists);
    });
  }

  async joinList(shareCode: string): Promise<void> {
    return this.inner.joinList?.(shareCode);
  }

  async leaveList(listId: string): Promise<void> {
    return this.inner.leaveList?.(listId);
  }

  async deleteList(listId: string): Promise<void> {
    return this.inner.deleteList?.(listId);
  }

  // ── Internal flush logic ───────────────────────────────────────────────────

  private async flushQueue() {
    if (this.isFlushing) return;
    const queued = await loadQueue();
    if (!queued) return;

    this.isFlushing = true;
    try {
      await this.inner.saveLists(queued.lists);
      await clearQueue();
      this._hasPendingSync = false;
      this._isOnline = true;
      this.notify();
    } catch {
      // Still offline — leave queue intact, try again next cycle
    } finally {
      this.isFlushing = false;
    }
  }
}
