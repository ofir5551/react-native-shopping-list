import React from 'react';
import * as WebBrowser from 'expo-web-browser';
import HomeScreen from './src/screens/HomeScreen';
import { ThemeProvider } from './src/context/ThemeContext';
import { ToastProvider } from './src/context/ToastContext';

import { AuthProvider } from './src/context/AuthContext';
import { SyncProvider } from './src/context/SyncContext';
import { PreferencesProvider } from './src/context/PreferencesContext';

// Complete any pending OAuth sessions on app load (required by expo-web-browser)
WebBrowser.maybeCompleteAuthSession();

export default function App() {
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

