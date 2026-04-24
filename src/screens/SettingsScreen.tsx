import React, { useEffect, useState } from 'react';
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
import Constants from 'expo-constants';

type SettingsScreenProps = {
    onBack: () => void;
    onSignIn: () => void;
};

export const SettingsScreen = ({ onBack, onSignIn }: SettingsScreenProps) => {
    const styles = useAppStyles();
    const { theme, isDark, setThemeType } = useTheme();
    const { preferences, setPreference, resetPreferences } = usePreferences();
    const { user } = useAuth();
    const { t, locale, setLocale, isRTL } = useLocale();
    const [isToSOpen, setIsToSOpen] = useState(false);
    const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
    const [aiUsage, setAiUsage] = useState<{ count: number; limit: number } | null>(null);

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
                            <Text style={styles.settingsValue}>{aiUsage.count} / {aiUsage.limit}</Text>
                        </View>
                    )}
                    <Pressable
                        style={styles.settingsRow}
                        onPress={() => setIsToSOpen(true)}
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
                        onPress={() => setIsPrivacyOpen(true)}
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
                                {'By using Shoppy, you agree to these terms.\n\n'}
                                {'Shoppy is a personal shopping list app provided for your individual use. You may use it only for lawful purposes.\n\n'}
                                {'AI Features: When you use AI features (Smart Suggestions, Scan Photo), your input is sent to OpenAI for processing. AI-generated content is provided as-is without any guarantee of accuracy.\n\n'}
                                {'Data: If you create an account, your lists are synced to our servers via Supabase. Guest users’ data stays on their device only.\n\n'}
                                {'No Warranty: Shoppy is provided “as is” without warranties of any kind. We are not liable for any loss of data or damages arising from your use of the app.\n\n'}
                                {'Changes: We may update these terms at any time. Continued use of the app constitutes acceptance of the updated terms.\n\n'}
                                {'Contact: ofirbenyamin3@gmail.com'}
                            </Text>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <Modal
                transparent
                visible={isPrivacyOpen}
                animationType="fade"
                onRequestClose={() => setIsPrivacyOpen(false)}
            >
                <View style={styles.modalContainer}>
                    <Pressable style={styles.modalBackdrop} onPress={() => setIsPrivacyOpen(false)} />
                    <View style={[styles.modalPanel, { maxHeight: '75%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('settings.privacyPolicy')}</Text>
                            <Pressable onPress={() => setIsPrivacyOpen(false)} style={styles.modalCloseButton}>
                                <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
                            </Pressable>
                        </View>
                        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
                            <Text style={{ fontSize: 14, color: theme.colors.text, lineHeight: 22 }}>
                                {'What We Collect\n'}
                                {'• Email address (if you create an account)\n'}
                                {'• Shopping list contents you enter\n'}
                                {'• Text or images sent to AI features\n\n'}
                                {'How We Use It\n'}
                                {'We use your data solely to provide the Shoppy service — syncing your lists across devices and generating AI suggestions. We do not sell your data.\n\n'}
                                {'Third-Party Services\n'}
                                {'• Supabase — handles authentication and data storage (supabase.com)\n'}
                                {'• OpenAI — processes AI feature requests; prompts and images you submit are sent to their servers (openai.com/privacy)\n\n'}
                                {'Guest Users\n'}
                                {'If you use Shoppy without an account, all data stays on your device and is never sent to our servers (AI features still send input to OpenAI).\n\n'}
                                {'Your Rights\n'}
                                {'You may delete your account at any time from Settings, which removes all your data from our servers.\n\n'}
                                {'Contact: ofirbenyamin3@gmail.com'}
                            </Text>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};
