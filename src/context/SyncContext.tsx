import React, { createContext, useContext, useEffect, useState } from 'react';
import { StorageProvider, LocalStorageProvider } from '../storage';
import { SupabaseStorageProvider } from '../storage/SupabaseStorageProvider';
import { useAuth } from './AuthContext';

type SyncContextType = {
    storageProvider: StorageProvider;
    isInitializing: boolean;
};

const SyncContext = createContext<SyncContextType>({
    storageProvider: LocalStorageProvider,
    isInitializing: true,
});

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isLoading } = useAuth();
    const [storageProvider, setStorageProvider] = useState<StorageProvider>(LocalStorageProvider);
    const [isInitializing, setIsInitializing] = useState(true);

    useEffect(() => {
        if (isLoading) return;

        const initializeStrategy = async () => {
            if (user) {
                const cloudProvider = new SupabaseStorageProvider(user.id);

                // Data Migration Strategy
                // Check if there are local lists to migrate
                try {
                    const localLists = await LocalStorageProvider.loadLists();
                    if (localLists.length > 0) {
                        await cloudProvider.saveLists(localLists);
                        // Option to clear local lists after migration, or leave them.
                        // For now, we clear them to avoid duplicating them again later if we sign out and in.
                        await LocalStorageProvider.saveLists([]);
                    }
                } catch (e) {
                    console.error('Migration failed:', e);
                }

                setStorageProvider(cloudProvider);
            } else {
                setStorageProvider(LocalStorageProvider);
            }
            setIsInitializing(false);
        };

        initializeStrategy();
    }, [user, isLoading]);

    return (
        <SyncContext.Provider value={{ storageProvider, isInitializing }}>
            {children}
        </SyncContext.Provider>
    );
};

export const useSync = () => useContext(SyncContext);
