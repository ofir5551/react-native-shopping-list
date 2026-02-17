import React from 'react';
import {
    SafeAreaView,
    ScrollView,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppStyles } from '../styles/appStyles';
import { useTheme } from '../context/ThemeContext';

type SettingsScreenProps = {
    onBack: () => void;
};

export const SettingsScreen = ({ onBack }: SettingsScreenProps) => {
    const styles = useAppStyles();
    const { theme, isDark, setThemeType } = useTheme();

    const toggleTheme = (value: boolean) => {
        setThemeType(value ? 'dark' : 'light');
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerRow}>
                    <View style={styles.headerLeft}>
                        <TouchableOpacity
                            style={[styles.iconButton, { marginRight: 12 }]}
                            onPress={onBack}
                            accessibilityRole="button"
                            accessibilityLabel="Go back"
                        >
                            <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
                        </TouchableOpacity>
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
                    <View style={styles.authPlaceholder}>
                        <Ionicons
                            name="person-circle-outline"
                            size={64}
                            color={theme.colors.textSecondary}
                            style={{ marginBottom: 16 }}
                        />
                        <Text style={[styles.settingsLabel, { marginBottom: 8 }]}>
                            Sign in to sync your lists
                        </Text>
                        <Text
                            style={[
                                styles.settingsValue,
                                { textAlign: 'center', marginBottom: 20 },
                            ]}
                        >
                            Create an account to backup your shopping lists and access them on
                            other devices.
                        </Text>

                        <TouchableOpacity style={styles.authButton}>
                            <Text style={styles.authButtonText}>Sign In</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.authButtonSecondary}>
                            <Text style={styles.authButtonTextSecondary}>Create Account</Text>
                        </TouchableOpacity>
                    </View>
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
