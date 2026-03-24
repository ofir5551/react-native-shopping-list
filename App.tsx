import React, { useEffect, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { I18nManager, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import HomeScreen from './src/screens/HomeScreen';
import { ThemeProvider } from './src/context/ThemeContext';
import { ToastProvider } from './src/context/ToastContext';
import { AuthProvider } from './src/context/AuthContext';
import { SyncProvider } from './src/context/SyncContext';
import { PreferencesProvider } from './src/context/PreferencesContext';
import { LocaleProvider } from './src/i18n/LocaleContext';
import { Locale, LOCALE_STORAGE_KEY, isRTLLocale } from './src/i18n/index';

// Complete any pending OAuth sessions on app load (required by expo-web-browser)
WebBrowser.maybeCompleteAuthSession();

export default function App() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });
  const [initialLocale, setInitialLocale] = useState<Locale | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(LOCALE_STORAGE_KEY).then((stored) => {
      const locale: Locale = stored === 'he' ? 'he' : 'en';
      const rtl = isRTLLocale(locale);
      I18nManager.allowRTL(rtl);
      I18nManager.forceRTL(rtl);
      setInitialLocale(locale);
    });
  }, []);

  if (!fontsLoaded || !initialLocale) {
    return <View style={{ flex: 1 }} />;
  }

  return (
    <LocaleProvider initialLocale={initialLocale}>
      <AuthProvider>
        <SyncProvider>
          <ThemeProvider>
            <PreferencesProvider>
              <ToastProvider>
                <HomeScreen />
              </ToastProvider>
            </PreferencesProvider>
          </ThemeProvider>
        </SyncProvider>
      </AuthProvider>
    </LocaleProvider>
  );
}
