import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { StorageProvider, LocalStorageProvider } from '../storage';
import { SupabaseStorageProvider } from '../storage/SupabaseStorageProvider';
import { OfflineQueuedStorageProvider } from '../storage/OfflineQueuedStorageProvider';
import { useAuth } from './AuthContext';

type SyncContextType = {
    storageProvider: StorageProvider;
    isInitializing: boolean;
    isOnline: boolean;
    hasPendingSync: boolean;
};

const SyncContext = createContext<SyncContextType>({
    storageProvider: LocalStorageProvider,
    isInitializing: true,
    isOnline: true,
    hasPendingSync: false,
});

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isLoading } = useAuth();
    const [storageProvider, setStorageProvider] = useState<StorageProvider>(LocalStorageProvider);
    const [isInitializing, setIsInitializing] = useState(true);
    const [isOnline, setIsOnline] = useState(true);
    const [hasPendingSync, setHasPendingSync] = useState(false);
    const queuedProviderRef = useRef<OfflineQueuedStorageProvider | null>(null);

    useEffect(() => {
        if (isLoading) return;

        let mounted = true;
        let cleanupFn: (() => void) | undefined;

        const run = async () => {
            // Tear down the previous cloud provider (if any)
            queuedProviderRef.current?.destroy();
            queuedProviderRef.current = null;

            if (user) {
                const cloudProvider = new SupabaseStorageProvider(user.id);

                // Data migration: copy local lists to Supabase on first sign-in
                try {
                    const localLists = await LocalStorageProvider.loadLists();
                    if (localLists.length > 0) {
                        await cloudProvider.saveLists(localLists);
                        await LocalStorageProvider.saveLists([]);
                    }
                } catch (e) {
                    console.error('Migration failed:', e);
                }

                if (!mounted) return;

                const queuedProvider = new OfflineQueuedStorageProvider(cloudProvider);

                const unsubStatus = queuedProvider.onStatusChange((online, pending) => {
                    if (mounted) {
                        setIsOnline(online);
                        setHasPendingSync(pending);
                    }
                });

                queuedProviderRef.current = queuedProvider;

                setStorageProvider(queuedProvider);
                setIsOnline(queuedProvider.isOnline);
                setHasPendingSync(queuedProvider.hasPendingSync);

                cleanupFn = () => {
                    unsubStatus();
                    queuedProvider.destroy();
                };
            } else {
                setStorageProvider(LocalStorageProvider);
                setIsOnline(true);
                setHasPendingSync(false);
            }

            if (mounted) setIsInitializing(false);
        };

        run();

        return () => {
            mounted = false;
            cleanupFn?.();
        };
    }, [user, isLoading]);

    return (
        <SyncContext.Provider value={{ storageProvider, isInitializing, isOnline, hasPendingSync }}>
            {children}
        </SyncContext.Provider>
    );
};

export const useSync = () => useContext(SyncContext);
