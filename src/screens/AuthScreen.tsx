import React, { useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    Text,
    Pressable,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useAppStyles } from '../styles/appStyles';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useLocale } from '../i18n/LocaleContext';
import { supabase } from '../supabase';

type AuthScreenProps = {
    onBack: () => void;
    onGoToLogin: () => void;
    onGoToSignup: () => void;
    onAuthSuccess: () => void;
};

export const AuthScreen = ({ onBack, onGoToLogin, onGoToSignup, onAuthSuccess }: AuthScreenProps) => {
    const styles = useAppStyles();
    const { theme, isDark } = useTheme();
    const { showToast } = useToast();
    const { t, isRTL } = useLocale();

    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGoogleSignIn = async () => {
        setIsGoogleLoading(true);
        setError(null);
        try {
            if (Platform.OS === 'web') {
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: window.location.origin },
                });
                if (error) throw error;
            } else {
                const redirectUrl = Linking.createURL('/');
                const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
                });
                if (error) throw error;
                if (data.url) {
                    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
                    if (result.type === 'success') {
                        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(result.url);
                        if (exchangeError) throw exchangeError;
                        showToast(t('login.signedIn'));
                        onAuthSuccess();
                    }
                }
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsGoogleLoading(false);
        }
    };

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
                <Pressable
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10,
                        backgroundColor: theme.colors.surface,
                        borderWidth: 1.5,
                        borderColor: theme.colors.border,
                        borderRadius: 14,
                        paddingVertical: 14,
                        marginBottom: 14,
                        shadowColor: '#000',
                        shadowOpacity: 0.06,
                        shadowRadius: 6,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: 2,
                    }}
                    onPress={handleGoogleSignIn}
                    disabled={isGoogleLoading}
                >
                    {isGoogleLoading ? (
                        <ActivityIndicator color={theme.colors.textSecondary} />
                    ) : (
                        <>
                            <AntDesign name="google" size={20} color="#DB4437" />
                            <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text }}>
                                {t('auth.continueWithGoogle')}
                            </Text>
                        </>
                    )}
                </Pressable>

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
                    disabled={isGoogleLoading}
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
                    disabled={isGoogleLoading}
                >
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 15 }}>
                        {t('login.newHere')}{' '}
                        <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>
                            {t('auth.newAccount')}
                        </Text>
                    </Text>
                </Pressable>

                {/* Error */}
                {error && (
                    <Text style={[styles.nameModalError, { marginTop: 16, textAlign: 'center' }]}>
                        {error}
                    </Text>
                )}
            </View>
        </SafeAreaView>
    );
};
