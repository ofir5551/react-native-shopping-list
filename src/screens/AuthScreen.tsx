import React from 'react';
import { Text, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppStyles } from '../styles/appStyles';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../i18n/LocaleContext';
import { GoogleSignInButton } from '../components/GoogleSignInButton';

type AuthScreenProps = {
    onBack: () => void;
    onGoToLogin: () => void;
    onGoToSignup: () => void;
    onAuthSuccess: () => void;
};

export const AuthScreen = ({ onBack, onGoToLogin, onGoToSignup, onAuthSuccess }: AuthScreenProps) => {
    const styles = useAppStyles();
    const { theme, isDark } = useTheme();
    const { t, isRTL } = useLocale();

    return (
        <SafeAreaView style={[styles.container, { paddingHorizontal: 0 }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
                <Pressable
                    style={styles.iconButton}
                    onPress={onBack}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.goBack')}
                >
                    <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={20} color={theme.colors.text} />
                </Pressable>
            </View>

            <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 20 }}>
                {/* Branding */}
                <View style={{ alignItems: 'center', marginBottom: 48 }}>
                    <View style={{
                        width: 80,
                        height: 80,
                        borderRadius: 24,
                        backgroundColor: theme.colors.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 16,
                    }}>
                        <Ionicons name="bag-outline" size={44} color="#ffffff" />
                    </View>
                    <Text style={[styles.title, { textAlign: 'center', marginBottom: 8 }]}>
                        {t('auth.title')}
                    </Text>
                    <Text style={[styles.subtitle, { textAlign: 'center' }]}>
                        {t('auth.subtitle')}
                    </Text>
                </View>

                {/* Google button */}
                <GoogleSignInButton onSuccess={onAuthSuccess} />

                {/* Divider */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                    <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
                    <Text style={{ marginHorizontal: 12, color: theme.colors.textSecondary, fontSize: 13 }}>
                        {t('common.or')}
                    </Text>
                    <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
                </View>

                {/* Sign in with email */}
                <Pressable
                    style={[styles.authButtonSecondary, { borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }]}
                    onPress={onGoToLogin}
                >
                    <Ionicons name="mail-outline" size={18} color={theme.colors.text} />
                    <Text style={[styles.authButtonTextSecondary, { fontSize: 16 }]}>
                        {t('auth.signInWithEmail')}
                    </Text>
                </Pressable>

                {/* Create account link */}
                <Pressable
                    style={{ alignItems: 'center', paddingVertical: 10 }}
                    onPress={onGoToSignup}
                >
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 15 }}>
                        {t('login.newHere')}{' '}
                        <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>
                            {t('auth.newAccount')}
                        </Text>
                    </Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
};
