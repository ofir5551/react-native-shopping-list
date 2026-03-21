import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFS_STORAGE_KEY = '@shopping-list/preferences';

type Preferences = {
    autoFocusKeyboard: boolean;
};

const DEFAULT_PREFS: Preferences = {
    autoFocusKeyboard: true,
};

type PreferencesContextType = {
    preferences: Preferences;
    setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
};

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFS);

    useEffect(() => {
        const load = async () => {
            try {
                const stored = await AsyncStorage.getItem(PREFS_STORAGE_KEY);
                if (stored) {
                    setPreferences({ ...DEFAULT_PREFS, ...JSON.parse(stored) });
                }
            } catch (error) {
                console.warn('Failed to load preferences', error);
            }
        };
        load();
    }, []);

    const setPreference = async <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
        const updated = { ...preferences, [key]: value };
        setPreferences(updated);
        try {
            await AsyncStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(updated));
        } catch (error) {
            console.warn('Failed to save preferences', error);
        }
    };

    return (
        <PreferencesContext.Provider value={{ preferences, setPreference }}>
            {children}
        </PreferencesContext.Provider>
    );
};

export const usePreferences = (): PreferencesContextType => {
    const ctx = useContext(PreferencesContext);
    if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
    return ctx;
};
