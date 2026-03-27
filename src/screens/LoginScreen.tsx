import React, { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    Pressable,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppStyles } from '../styles/appStyles';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useLocale } from '../i18n/LocaleContext';
import { supabase } from '../supabase';

type AuthError = {
    field: 'email' | 'password' | 'general';
    message: string;
} | null;

type LoginScreenProps = {
    onBack: () => void;
    onGoToSignup: () => void;
    onLoginSuccess: () => void;
};

export const LoginScreen = ({ onBack, onGoToSignup, onLoginSuccess }: LoginScreenProps) => {
    const styles = useAppStyles();
    const { theme, isDark } = useTheme();
    const { showToast } = useToast();
    const { t, isRTL } = useLocale();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [authError, setAuthError] = useState<AuthError>(null);
    const [forgotPasswordSent, setForgotPasswordSent] = useState(false);

    const handleSignIn = async () => {
        setAuthError(null);
        if (!email.trim()) {
            setAuthError({ field: 'email', message: t('login.errorEmail') });
            return;
        }
        if (!password) {
            setAuthError({ field: 'password', message: t('login.errorPassword') });
            return;
        }

        setIsLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        setIsLoading(false);

        if (error) {
            setAuthError({ field: 'general', message: error.message });
        } else {
            showToast(t('login.signedIn'));
            onLoginSuccess();
        }
    };

    const handleForgotPassword = async () => {
        if (!email.trim()) {
            setAuthError({ field: 'email', message: t('login.errorForgotEmail') });
            return;
        }
        setAuthError(null);
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
        if (error) {
            setAuthError({ field: 'general', message: error.message });
        } else {
            setForgotPasswordSent(true);
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

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 60, paddingTop: 20 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <Text style={[styles.title, { marginBottom: 28 }]}>
                        {t('login.welcomeBack')}
                    </Text>

                    {/* Email field */}
                    <View style={{ marginBottom: 12 }}>
                        <Text style={{ fontSize: 14, fontWeight: '500', color: theme.colors.textSecondary, marginBottom: 6 }}>
                            {t('login.emailLabel')}
                        </Text>
                        <TextInput
                            style={[styles.nameModalInput, { fontSize: 16, paddingVertical: 12 }]}
                            placeholder={t('login.emailPlaceholder')}
                            placeholderTextColor={theme.colors.textSecondary}
                            value={email}
                            onChangeText={(v) => { setEmail(v); setAuthError(null); setForgotPasswordSent(false); }}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            autoComplete="email"
                            returnKeyType="next"
                            autoFocus
                        />
                        {authError?.field === 'email' && (
                            <Text style={[styles.nameModalError, { marginTop: 4 }]}>{authError.message}</Text>
                        )}
                    </View>

                    {/* Password field */}
                    <View style={{ marginBottom: 6 }}>
                        <Text style={{ fontSize: 14, fontWeight: '500', color: theme.colors.textSecondary, marginBottom: 6 }}>
                            {t('login.passwordLabel')}
                        </Text>
                        <View style={[styles.nameModalInput, { flexDirection: 'row', alignItems: 'center', paddingVertical: 0 }]}>
                            <TextInput
                                style={{ flex: 1, fontSize: 16, color: theme.colors.text, paddingVertical: 12 }}
                                placeholder={t('login.passwordPlaceholder')}
                                placeholderTextColor={theme.colors.textSecondary}
                                value={password}
                                onChangeText={(v) => { setPassword(v); setAuthError(null); }}
                                secureTextEntry={!showPassword}
                                autoComplete="password"
                                returnKeyType="done"
                                onSubmitEditing={handleSignIn}
                            />
                            <Pressable onPress={() => setShowPassword(prev => !prev)} style={{ paddingHorizontal: 8 }}>
                                <Ionicons
                                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                    size={20}
                                    color={theme.colors.textSecondary}
                                />
                            </Pressable>
                        </View>
                        {authError?.field === 'password' && (
                            <Text style={[styles.nameModalError, { marginTop: 4 }]}>{authError.message}</Text>
                        )}
                    </View>

                    {/* Forgot password */}
                    <View style={{ alignItems: 'flex-end', marginBottom: 20 }}>
                        {forgotPasswordSent ? (
                            <Text style={{ fontSize: 13, color: theme.colors.primary }}>
                                {t('login.resetSent', { email })}
                            </Text>
                        ) : (
                            <Pressable onPress={handleForgotPassword}>
                                <Text style={{ fontSize: 13, color: theme.colors.primary, fontWeight: '500' }}>
                                    {t('login.forgotPassword')}
                                </Text>
                            </Pressable>
                        )}
                    </View>

                    {/* General error */}
                    {authError?.field === 'general' && (
                        <Text style={[styles.nameModalError, { marginBottom: 12, textAlign: 'center' }]}>
                            {authError.message}
                        </Text>
                    )}

                    {/* Sign In button */}
                    <Pressable
                        style={[styles.authButton, { borderRadius: 14, paddingVertical: 14, marginVertical: 0 }]}
                        onPress={handleSignIn}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text style={[styles.authButtonText, { fontSize: 16 }]}>{t('login.signIn')}</Text>
                        )}
                    </Pressable>

                    {/* Create account link */}
                    <Pressable
                        style={{ marginTop: 32, alignItems: 'center' }}
                        onPress={onGoToSignup}
                    >
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 15 }}>
                            {t('login.newHere')}{' '}
                            <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>
                                {t('login.createAccount')}
                            </Text>
                        </Text>
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};
