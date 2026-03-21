import React from 'react';
import {
    Image,
    SafeAreaView,
    ScrollView,
    Switch,
    Text,
    Pressable,
    View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppStyles } from '../styles/appStyles';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';

type SettingsScreenProps = {
    onBack: () => void;
    onSignIn: () => void;
};

export const SettingsScreen = ({ onBack, onSignIn }: SettingsScreenProps) => {
    const styles = useAppStyles();
    const { theme, isDark, setThemeType } = useTheme();
    const { user } = useAuth();

    const toggleTheme = (value: boolean) => {
        setThemeType(value ? 'dark' : 'light');
    };

    const displayName =
        user?.user_metadata?.full_name ||
        user?.user_metadata?.display_name ||
        user?.email?.split('@')[0];

    const handleSignOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerRow}>
                    <View style={styles.headerLeft}>
                        <Pressable
                            style={[styles.overlayBackBtn, { marginRight: 12 }]}
                            onPress={onBack}
                            accessibilityRole="button"
                            accessibilityLabel="Go back"
                        >
                            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                        </Pressable>
                        <Text style={styles.title}>Settings</Text>
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                <View style={styles.settingsSection}>
                    <Text style={styles.settingsSectionTitle}>Appearance</Text>
                    <View style={[styles.settingsRow, styles.settingsRowLast]}>
                        <Text style={styles.settingsLabel}>Dark Mode</Text>
                        <Switch
                            value={isDark}
                            onValueChange={toggleTheme}
                            trackColor={{ false: theme.colors.surfaceHighlight, true: theme.colors.primary }}
                            thumbColor={isDark ? theme.colors.primaryText : '#f4f3f4'}
                            ios_backgroundColor={theme.colors.surfaceHighlight}
                        />
                    </View>
                </View>

                <View style={styles.settingsSection}>
                    <Text style={styles.settingsSectionTitle}>Account</Text>
                    {user ? (
                        <View style={styles.authPlaceholder}>
                            {user.user_metadata?.avatar_url ? (
                                <Image
                                    source={{ uri: user.user_metadata.avatar_url }}
                                    style={{ width: 64, height: 64, borderRadius: 32, marginBottom: 16 }}
                                />
                            ) : (
                                <Ionicons
                                    name="person-circle"
                                    size={64}
                                    color={theme.colors.primary}
                                    style={{ marginBottom: 16 }}
                                />
                            )}
                            <Text style={[styles.settingsLabel, { marginBottom: 4 }]}>
                                Hi, {displayName}!
                            </Text>
                            <Text style={[styles.settingsValue, { textAlign: 'center', marginBottom: 20 }]}>
                                {user.email}
                            </Text>
                            <Text style={[styles.settingsValue, { textAlign: 'center', color: '#4caf50', marginBottom: 20 }]}>
                                Cloud Sync Active
                            </Text>
                            <Pressable style={styles.authButtonSecondary} onPress={handleSignOut}>
                                <Text style={styles.authButtonTextSecondary}>Sign Out</Text>
                            </Pressable>
                        </View>
                    ) : (
                        <View style={styles.authPlaceholder}>
                            <Ionicons
                                name="cloud-offline-outline"
                                size={64}
                                color={theme.colors.textSecondary}
                                style={{ marginBottom: 16 }}
                            />
                            <Text style={[styles.settingsLabel, { marginBottom: 8 }]}>
                                Guest Mode
                            </Text>
                            <Text
                                style={[
                                    styles.settingsValue,
                                    { textAlign: 'center', marginBottom: 20 },
                                ]}
                            >
                                Local Storage Only. Sign in to sync your lists to the cloud.
                            </Text>

                            <Pressable style={styles.authButton} onPress={onSignIn}>
                                <Text style={styles.authButtonText}>Sign In / Create Account</Text>
                            </Pressable>
                        </View>
                    )}
                </View>

                <View style={styles.settingsSection}>
                    <Text style={styles.settingsSectionTitle}>About</Text>
                    <View style={styles.settingsRow}>
                        <Text style={styles.settingsLabel}>Version</Text>
                        <Text style={styles.settingsValue}>1.0.0</Text>
                    </View>
                    <View style={[styles.settingsRow, styles.settingsRowLast]}>
                        <Text style={styles.settingsLabel}>Terms of Service</Text>
                        <Ionicons
                            name="chevron-forward"
                            size={20}
                            color={theme.colors.textSecondary}
                        />
                    </View>
                </View>
            </ScrollView>

            <StatusBar style={isDark ? 'light' : 'dark'} />
        </SafeAreaView>
    );
};
