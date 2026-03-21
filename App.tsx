import React from 'react';
import * as WebBrowser from 'expo-web-browser';
import { View } from 'react-native';
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

// Complete any pending OAuth sessions on app load (required by expo-web-browser)
WebBrowser.maybeCompleteAuthSession();

export default function App() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1 }} />;
  }

  return (
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
  );
}
