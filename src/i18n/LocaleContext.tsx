import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { Alert, Platform } from 'react-native';
import { Locale, LOCALE_STORAGE_KEY, TranslationKey, createT, isRTLLocale } from './index';

type T = (key: TranslationKey, vars?: Record<string, string | number>) => string;

type LocaleContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  t: T;
  isRTL: boolean;
};

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export const LocaleProvider: React.FC<{ children: React.ReactNode; initialLocale: Locale }> = ({
  children,
  initialLocale,
}) => {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const t = createT(locale);

  const setLocale = async (newLocale: Locale) => {
    await AsyncStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    setLocaleState(newLocale);
    if (Platform.OS === 'web') {
      // @ts-ignore
      window.location.reload();
      return;
    }
    try {
      await Updates.reloadAsync();
    } catch {
      // In Expo Go / development, reloadAsync is unavailable — prompt the user to restart manually
      const tNew = createT(newLocale);
      Alert.alert(tNew('settings.restartTitle'), tNew('settings.restartMessage'));
    }
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t, isRTL: isRTLLocale(locale) }}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = (): LocaleContextType => {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
};
