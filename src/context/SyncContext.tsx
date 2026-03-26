import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageProvider, LocalStorageProvider } from '../storage';
import { SupabaseApiClient } from '../sync/SupabaseApiClient';
import { SyncEngine, DIRTY_IDS_KEY, PENDING_DELETES_KEY } from '../sync/SyncEngine';
import { ShoppingList } from '../types';
import { useAuth } from './AuthContext';

type SyncContextType = {
    storageProvider: StorageProvider;
    isInitializing: boolean;
    joinList: (shareCode: string) => Promise<void>;
    leaveList: (listId: string) => Promise<void>;
    deleteListFromServer: (listId: string) => Promise<void>;
};

const SyncContext = createContext<SyncContextType>({
    storageProvider: LocalStorageProvider,
    isInitializing: true,
    joinList: async () => { },
    leaveList: async () => { },
    deleteListFromServer: async () => { },
});

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isLoading } = useAuth();
    const [isInitializing, setIsInitializing] = useState(true);
    const syncEngineRef = useRef<SyncEngine | null>(null);
    const remoteUpdateCallbackRef = useRef<((lists: ShoppingList[]) => void) | null>(null);

    // Wrapped provider: always reads/writes to local, notifies SyncEngine on save
    const wrappedProviderRef = useRef<StorageProvider>({
        loadLists: () => LocalStorageProvider.loadLists(),
        saveLists: async (lists: ShoppingList[]) => {
            await LocalStorageProvider.saveLists(lists);
            syncEngineRef.current?.onLocalSave(lists);
        },
        subscribe: (onChange: (lists: ShoppingList[]) => void) => {
            remoteUpdateCallbackRef.current = onChange;
            return () => {
                remoteUpdateCallbackRef.current = null;
            };
        },
    });

    useEffect(() => {
        if (isLoading) return;

        if (user) {
            const apiClient = new SupabaseApiClient(user.id);
            const engine = new SyncEngine(user.id, apiClient, (mergedLists) => {
                // When remote data arrives, notify the subscribe callback
                // (useShoppingListsApp will pick this up via isFromRealtimeRef)
                remoteUpdateCallbackRef.current?.(mergedLists);
            });

            syncEngineRef.current = engine;
            engine.start().then(() => {
                setIsInitializing(false);
            }).catch(() => {
                // Even if initial sync fails, the app works from local data
                setIsInitializing(false);
            });

            return () => {
                engine.stop();
                syncEngineRef.current = null;
            };
        } else {
            // Clear queued sync data so a future sign-in (possibly a different user)
            // does not attempt to push stale list ids.
            AsyncStorage.multiRemove([DIRTY_IDS_KEY, PENDING_DELETES_KEY]);
            syncEngineRef.current = null;
            setIsInitializing(false);
        }
    }, [user, isLoading]);

    const joinList = async (shareCode: string): Promise<void> => {
        if (!syncEngineRef.current) {
            throw new Error('You need to be signed in to join a list.');
        }
        await syncEngineRef.current.joinList(shareCode);
    };

    const leaveList = async (listId: string): Promise<void> => {
        if (!syncEngineRef.current) {
            throw new Error('You need to be signed in to leave a list.');
        }
        await syncEngineRef.current.leaveList(listId);
    };

    const deleteListFromServer = async (listId: string): Promise<void> => {
        if (syncEngineRef.current) {
            await syncEngineRef.current.deleteList(listId);
        } else {
            // Queue delete so SyncEngine processes it on next sign-in
            const raw = await AsyncStorage.getItem(PENDING_DELETES_KEY);
            const pending: string[] = raw ? JSON.parse(raw) : [];
            if (!pending.includes(listId)) {
                pending.push(listId);
                await AsyncStorage.setItem(PENDING_DELETES_KEY, JSON.stringify(pending));
            }
        }
    };

    return (
        <SyncContext.Provider value={{
            storageProvider: wrappedProviderRef.current,
            isInitializing,
            joinList,
            leaveList,
            deleteListFromServer,
        }}>
            {children}
        </SyncContext.Provider>
    );
};

export const useSync = () => useContext(SyncContext);
