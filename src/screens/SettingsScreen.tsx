import React, { useState } from 'react';
import {
    Image,
    Modal,
    ScrollView,
    Switch,
    Text,
    Pressable,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppStyles } from '../styles/appStyles';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../i18n/LocaleContext';
import { supabase } from '../supabase';

type SettingsScreenProps = {
    onBack: () => void;
    onSignIn: () => void;
};

export const SettingsScreen = ({ onBack, onSignIn }: SettingsScreenProps) => {
    const styles = useAppStyles();
    const { theme, isDark, setThemeType } = useTheme();
    const { preferences, setPreference } = usePreferences();
    const { user } = useAuth();
    const { t, locale, setLocale, isRTL } = useLocale();
    const [isToSOpen, setIsToSOpen] = useState(false);

    const toggleTheme = (value: boolean) => {
        setThemeType(value ? 'dark' : 'light');
    };

    const toggleLocale = () => {
        setLocale(locale === 'en' ? 'he' : 'en');
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
                            accessibilityLabel={t('common.goBack')}
                        >
                            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={theme.colors.text} />
                        </Pressable>
                        <Text style={styles.title}>{t('settings.title')}</Text>
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                <View style={styles.settingsSection}>
                    <Text style={styles.settingsSectionTitle}>{t('settings.appearance')}</Text>
                    <View style={styles.settingsRow}>
                        <Text style={styles.settingsLabel}>{t('settings.darkMode')}</Text>
                        <Switch
                            value={isDark}
                            onValueChange={toggleTheme}
                            trackColor={{ false: theme.colors.surfaceHighlight, true: theme.colors.primary }}
                            thumbColor={isDark ? theme.colors.primaryText : '#f4f3f4'}
                            ios_backgroundColor={theme.colors.surfaceHighlight}
                        />
                    </View>
                    <View style={styles.settingsRow}>
                        <Text style={styles.settingsLabel}>{t('settings.autoFocusKeyboard')}</Text>
                        <Switch
                            value={preferences.autoFocusKeyboard}
                            onValueChange={(value) => setPreference('autoFocusKeyboard', value)}
                            trackColor={{ false: theme.colors.surfaceHighlight, true: theme.colors.primary }}
                            thumbColor={preferences.autoFocusKeyboard ? theme.colors.primaryText : '#f4f3f4'}
                            ios_backgroundColor={theme.colors.surfaceHighlight}
                        />
                    </View>
                    <View style={styles.settingsRow}>
                        <Text style={styles.settingsLabel}>{t('settings.parserDevMode')}</Text>
                        <Switch
                            value={preferences.parserDevMode}
                            onValueChange={(value) => setPreference('parserDevMode', value)}
                            trackColor={{ false: theme.colors.surfaceHighlight, true: theme.colors.primary }}
                            thumbColor={preferences.parserDevMode ? theme.colors.primaryText : '#f4f3f4'}
                            ios_backgroundColor={theme.colors.surfaceHighlight}
                        />
                    </View>
                    <View style={[styles.settingsRow, styles.settingsRowLast]}>
                        <Text style={styles.settingsLabel}>{t('settings.language')}</Text>
                        <Pressable
                            onPress={toggleLocale}
                            style={({ pressed }) => ({
                                paddingHorizontal: 14,
                                paddingVertical: 6,
                                borderRadius: 8,
                                backgroundColor: theme.colors.surfaceHighlight,
                                opacity: pressed ? 0.7 : 1,
                            })}
                            accessibilityRole="button"
                        >
                            <Text style={{ fontSize: 15, fontFamily: theme.fonts.medium, color: theme.colors.primary }}>
                                {locale === 'en' ? 'English' : 'עברית'}
                            </Text>
                        </Pressable>
                    </View>
                </View>

                <View style={styles.settingsSection}>
                    <Text style={styles.settingsSectionTitle}>{t('settings.account')}</Text>
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
                                {t('settings.greeting', { name: displayName ?? '' })}
                            </Text>
                            <Text style={[styles.settingsValue, { textAlign: 'center', marginBottom: 20 }]}>
                                {user.email}
                            </Text>
                            <Text style={[styles.settingsValue, { textAlign: 'center', color: theme.colors.syncActive, marginBottom: 20 }]}>
                                {t('settings.cloudSyncActive')}
                            </Text>
                            <Pressable style={styles.authButtonSecondary} onPress={handleSignOut}>
                                <Text style={styles.authButtonTextSecondary}>{t('settings.signOut')}</Text>
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
                                {t('settings.guestMode')}
                            </Text>
                            <Text
                                style={[
                                    styles.settingsValue,
                                    { textAlign: 'center', marginBottom: 20 },
                                ]}
                            >
                                {t('settings.guestDescription')}
                            </Text>

                            <Pressable style={styles.authButton} onPress={onSignIn}>
                                <Text style={styles.authButtonText}>{t('settings.signIn')}</Text>
                            </Pressable>
                        </View>
                    )}
                </View>

                <View style={styles.settingsSection}>
                    <Text style={styles.settingsSectionTitle}>{t('settings.about')}</Text>
                    <View style={styles.settingsRow}>
                        <Text style={styles.settingsLabel}>{t('common.version')}</Text>
                        <Text style={styles.settingsValue}>1.0.0</Text>
                    </View>
                    <Pressable
                        style={[styles.settingsRow, styles.settingsRowLast]}
                        onPress={() => setIsToSOpen(true)}
                    >
                        <Text style={styles.settingsLabel}>{t('settings.termsOfService')}</Text>
                        <Ionicons
                            name={isRTL ? 'chevron-back' : 'chevron-forward'}
                            size={20}
                            color={theme.colors.textSecondary}
                        />
                    </Pressable>
                </View>
            </ScrollView>

            <StatusBar style={isDark ? 'light' : 'dark'} />

            <Modal
                transparent
                visible={isToSOpen}
                animationType="fade"
                onRequestClose={() => setIsToSOpen(false)}
            >
                <View style={styles.modalContainer}>
                    <Pressable style={styles.modalBackdrop} onPress={() => setIsToSOpen(false)} />
                    <View style={[styles.modalPanel, { maxHeight: '75%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('settings.termsOfService')}</Text>
                            <Pressable onPress={() => setIsToSOpen(false)} style={styles.modalCloseButton}>
                                <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
                            </Pressable>
                        </View>
                        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
                            <Text style={{ fontSize: 14, color: theme.colors.text, lineHeight: 22 }}>
                                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.{'\n\n'}
                                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.{'\n\n'}
                                Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.{'\n\n'}
                                Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est qui dolorem ipsum quia dolor sit amet.{'\n\n'}
                                At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.
                            </Text>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};
