import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme } from '../styles/theme';
import { ThemeId, Palette, PALETTES, DEFAULT_THEME_ID, resolveThemeId } from '../styles/palettes';

type ThemeContextType = {
  theme: Theme;
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@shopping-list/theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeId, setThemeIdState] = useState<ThemeId>(DEFAULT_THEME_ID);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        setThemeIdState(resolveThemeId(stored));
      } catch (error) {
        console.warn('Failed to load theme preference', error);
      } finally {
        setIsReady(true);
      }
    };
    loadTheme();
  }, []);

  const setThemeId = async (id: ThemeId) => {
    setThemeIdState(id);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, id);
    } catch (error) {
      console.warn('Failed to save theme preference', error);
    }
  };

  const palette: Palette = PALETTES[themeId];

  if (!isReady) return null;

  return (
    <ThemeContext.Provider value={{ theme: palette, themeId, setThemeId, isDark: palette.isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
