import React from 'react';
import HomeScreen from './src/screens/HomeScreen';
import { ThemeProvider } from './src/context/ThemeContext';

import { AuthProvider } from './src/context/AuthContext';
import { SyncProvider } from './src/context/SyncContext';

export default function App() {
    return (
        <AuthProvider>
            <SyncProvider>
                <ThemeProvider>
                    <HomeScreen />
                </ThemeProvider>
            </SyncProvider>
        </AuthProvider>
    );
}

