import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { Theme, lightTheme, darkTheme } from '../styles/theme';

type ThemeType = 'light' | 'dark' | 'system';

type ThemeContextType = {
    theme: Theme;
    themeType: ThemeType;
    setThemeType: (type: ThemeType) => void;
    isDark: boolean;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@shopping-list/theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const [themeType, setThemeType] = useState<ThemeType>('system');
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const loadTheme = async () => {
            try {
                const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
                if (stored === 'light' || stored === 'dark' || stored === 'system') {
                    setThemeType(stored);
                }
            } catch (error) {
                console.warn('Failed to load theme preference', error);
            } finally {
                setIsReady(true);
            }
        };
        loadTheme();
    }, []);

    const handleSetTheme = async (type: ThemeType) => {
        setThemeType(type);
        try {
            await AsyncStorage.setItem(THEME_STORAGE_KEY, type);
        } catch (error) {
            console.warn('Failed to save theme preference', error);
        }
    };

    const activeThemeType =
        themeType === 'system' ? (systemColorScheme === 'dark' ? 'dark' : 'light') : themeType;

    const theme = activeThemeType === 'dark' ? darkTheme : lightTheme;

    if (!isReady) {
        return null; // Or a loading spinner if preferred
    }

    return (
        <ThemeContext.Provider
            value={{
                theme,
                themeType,
                setThemeType: handleSetTheme,
                isDark: activeThemeType === 'dark',
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
