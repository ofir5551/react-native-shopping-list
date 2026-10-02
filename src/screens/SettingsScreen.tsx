import React, { useEffect, useState } from 'react';
import {
    Image,
    Linking,
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
import { useToast } from '../context/ToastContext';
import { deleteAccount } from '../utils/deleteAccount';
import { supabase } from '../supabase';
import Constants from 'expo-constants';

const SITE_URL = 'https://ofir5551.github.io/react-native-shopping-list';

type SettingsScreenProps = {
    onBack: () => void;
    onSignIn: () => void;
    onTheme: () => void;
};

export const SettingsScreen = ({ onBack, onSignIn, onTheme }: SettingsScreenProps) => {
    const styles = useAppStyles();
    const { theme, themeId, isDark } = useTheme();
    const { preferences, setPreference, resetPreferences } = usePreferences();
    const listViewModes = ['compact', 'normal', 'wide'] as const;
    const { user } = useAuth();
    const { t, locale, setLocale, isRTL } = useLocale();
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const { showToast } = useToast();
    const [aiUsage, setAiUsage] = useState<{ count: number; limit: number } | null>(null);

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

    const handleDeleteAccount = async () => {
        setIsDeleting(true);
        try {
            await deleteAccount();
            setIsDeleteOpen(false);
            showToast(t('settings.deleteAccountSuccess'));
        } catch {
            showToast(t('settings.deleteAccountError'));
        } finally {
            setIsDeleting(false);
        }
    };

    useEffect(() => {
        if (!user) return;
        const today = new Date().toISOString().split('T')[0];
        supabase
            .from('ai_usage')
            .select('call_count')
            .eq('user_id', user.id)
            .eq('call_date', today)
            .maybeSingle()
            .then(({ data, error }) => {
                if (error) console.warn('ai_usage fetch error:', error);
                setAiUsage({ count: data?.call_count ?? 0, limit: user.is_anonymous ? 5 : 20 });
            });
    }, [user]);

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
                    <Pressable
                        style={styles.settingsRow}
                        onPress={onTheme}
                        accessibilityRole="button"
                    >
                        <Text style={styles.settingsLabel}>{t('settings.theme')}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.settingsValue}>{t(`theme.${themeId}` as any)}</Text>
                            <Ionicons
                                name={isRTL ? 'chevron-back' : 'chevron-forward'}
                                size={20}
                                color={theme.colors.textSecondary}
                            />
                        </View>
                    </Pressable>
                    <View style={styles.settingsRow}>
                        <Text style={styles.settingsLabel}>{t('settings.listView')}</Text>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                            {listViewModes.map((mode) => {
                                const isActive = preferences.listViewMode === mode;
                                return (
                                    <Pressable
                                        key={mode}
                                        onPress={() => setPreference('listViewMode', mode)}
                                        style={({ pressed }) => ({
                                            paddingHorizontal: 12,
                                            paddingVertical: 6,
                                            borderRadius: 8,
                                            backgroundColor: isActive ? theme.colors.primary : theme.colors.surfaceHighlight,
                                            opacity: pressed ? 0.7 : 1,
                                        })}
                                        accessibilityRole="button"
                                        accessibilityState={{ selected: isActive }}
                                    >
                                        <Text style={{
                                            fontSize: 14,
                                            fontFamily: theme.fonts.medium,
                                            color: isActive ? theme.colors.primaryText : theme.colors.textSecondary,
                                        }}>
                                            {t(`settings.listView.${mode}`)}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
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
                    {user && !user.is_anonymous ? (
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
                            <Pressable onPress={() => setIsDeleteOpen(true)} accessibilityRole="button">
                                <Text style={[styles.settingsValue, { color: theme.colors.danger, marginTop: 8 }]}>
                                    {t('settings.deleteAccount')}
                                </Text>
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

                {__DEV__ && <View style={styles.settingsSection}>
                    <Text style={styles.settingsSectionTitle}>{t('settings.developerOptions')}</Text>
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
                    {(
                        [
                            { key: 'silenceCompleteMs', label: t('settings.silenceCompleteMs'), min: 200, max: 2000, step: 100 },
                            { key: 'silencePossiblyCompleteMs', label: t('settings.silencePossiblyCompleteMs'), min: 100, max: 1000, step: 100 },
                        ] as const
                    ).map(({ key, label, min, max, step }) => (
                        <View key={key} style={styles.settingsRow}>
                            <Text style={[styles.settingsLabel, { flex: 1 }]}>{label}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Pressable
                                    onPress={() => setPreference(key, Math.max(min, preferences[key] - step))}
                                    style={({ pressed }) => ({
                                        width: 28, height: 28, borderRadius: 14,
                                        backgroundColor: theme.colors.surfaceHighlight,
                                        alignItems: 'center', justifyContent: 'center',
                                        opacity: pressed ? 0.6 : 1,
                                    })}
                                    accessibilityRole="button"
                                >
                                    <Ionicons name="remove" size={16} color={theme.colors.text} />
                                </Pressable>
                                <Text style={{ fontSize: 13, fontFamily: theme.fonts.medium, color: theme.colors.text, minWidth: 44, textAlign: 'center' }}>
                                    {preferences[key]}ms
                                </Text>
                                <Pressable
                                    onPress={() => setPreference(key, Math.min(max, preferences[key] + step))}
                                    style={({ pressed }) => ({
                                        width: 28, height: 28, borderRadius: 14,
                                        backgroundColor: theme.colors.surfaceHighlight,
                                        alignItems: 'center', justifyContent: 'center',
                                        opacity: pressed ? 0.6 : 1,
                                    })}
                                    accessibilityRole="button"
                                >
                                    <Ionicons name="add" size={16} color={theme.colors.text} />
                                </Pressable>
                            </View>
                        </View>
                    ))}
                    <Pressable
                        style={[styles.settingsRow, styles.settingsRowLast]}
                        onPress={resetPreferences}
                        accessibilityRole="button"
                    >
                        <Text style={[styles.settingsLabel, { color: theme.colors.danger }]}>{t('settings.resetDefaults')}</Text>
                    </Pressable>
                </View>}

                <View style={styles.settingsSection}>
                    <Text style={styles.settingsSectionTitle}>{t('settings.about')}</Text>
                    <View style={styles.settingsRow}>
                        <Text style={styles.settingsLabel}>{t('common.version')}</Text>
                        <Text style={styles.settingsValue}>{Constants.expoConfig?.version ?? '1.0.0'}</Text>
                    </View>
                    {aiUsage !== null && (
                        <View style={styles.settingsRow}>
                            <Text style={styles.settingsLabel}>{t('settings.aiUsageToday')}</Text>
                            <Text style={styles.settingsValue}>{`‎${aiUsage.count} / ${aiUsage.limit}`}</Text>
                        </View>
                    )}
                    <Pressable
                        style={styles.settingsRow}
                        onPress={() => Linking.openURL(`${SITE_URL}/terms.html`)}
                    >
                        <Text style={styles.settingsLabel}>{t('settings.termsOfService')}</Text>
                        <Ionicons
                            name={isRTL ? 'chevron-back' : 'chevron-forward'}
                            size={20}
                            color={theme.colors.textSecondary}
                        />
                    </Pressable>
                    <Pressable
                        style={[styles.settingsRow, styles.settingsRowLast]}
                        onPress={() => Linking.openURL(`${SITE_URL}/privacy.html`)}
                    >
                        <Text style={styles.settingsLabel}>{t('settings.privacyPolicy')}</Text>
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
                visible={isDeleteOpen}
                animationType="fade"
                onRequestClose={() => !isDeleting && setIsDeleteOpen(false)}
            >
                <View style={styles.modalContainer}>
                    <Pressable style={styles.modalBackdrop} onPress={() => !isDeleting && setIsDeleteOpen(false)} />
                    <View style={[styles.modalPanel, { height: undefined, paddingBottom: 24 }]}>
                        <Text style={[styles.modalTitle, { marginBottom: 12 }]}>{t('settings.deleteAccountTitle')}</Text>
                        <Text style={{ fontSize: 14, color: theme.colors.text, lineHeight: 22, marginBottom: 16 }}>
                            {t('settings.deleteAccountMessage')}
                        </Text>
                        <Pressable
                            style={[styles.authButton, { backgroundColor: theme.colors.danger, opacity: isDeleting ? 0.6 : 1 }]}
                            onPress={handleDeleteAccount}
                            disabled={isDeleting}
                            accessibilityRole="button"
                        >
                            <Text style={styles.authButtonText}>{t('settings.deleteAccountConfirm')}</Text>
                        </Pressable>
                        <Pressable
                            style={styles.authButtonSecondary}
                            onPress={() => setIsDeleteOpen(false)}
                            disabled={isDeleting}
                            accessibilityRole="button"
                        >
                            <Text style={styles.authButtonTextSecondary}>{t('common.cancel')}</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};
