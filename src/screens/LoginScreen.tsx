import React, { useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    SafeAreaView,
    ScrollView,
    Text,
    TextInput,
    Pressable,
    View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useAppStyles } from '../styles/appStyles';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
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

    const [emailExpanded, setEmailExpanded] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [authError, setAuthError] = useState<AuthError>(null);
    const [forgotPasswordSent, setForgotPasswordSent] = useState(false);

    const handleSignIn = async () => {
        setAuthError(null);
        if (!email.trim()) {
            setAuthError({ field: 'email', message: 'Please enter your email.' });
            return;
        }
        if (!password) {
            setAuthError({ field: 'password', message: 'Please enter your password.' });
            return;
        }

        setIsLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        setIsLoading(false);

        if (error) {
            setAuthError({ field: 'general', message: error.message });
        } else {
            showToast('Signed in successfully!');
            onLoginSuccess();
        }
    };

    const handleForgotPassword = async () => {
        if (!email.trim()) {
            setAuthError({ field: 'email', message: 'Enter your email first, then tap Forgot Password.' });
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

    const handleGoogleSignIn = async () => {
        setIsGoogleLoading(true);
        setAuthError(null);
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
                        showToast('Signed in successfully!');
                        onLoginSuccess();
                    }
                }
            }
        } catch (err: any) {
            setAuthError({ field: 'general', message: err.message });
        } finally {
            setIsGoogleLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { paddingHorizontal: 0 }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            {/* Back button */}
            <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
                <Pressable
                    style={styles.iconButton}
                    onPress={onBack}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
                </Pressable>
            </View>

            <ScrollView
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 60, paddingTop: 20 }}
                keyboardShouldPersistTaps="handled"
            >
                {/* Branding */}
                <View style={{ alignItems: 'center', marginBottom: 40 }}>
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
                        Welcome Back
                    </Text>
                    <Text style={[styles.subtitle, { textAlign: 'center' }]}>
                        Sign in to sync your lists across all your devices
                    </Text>
                </View>

                {/* Google hero button */}
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
                    disabled={isGoogleLoading || isLoading}
                >
                    {isGoogleLoading ? (
                        <ActivityIndicator color={theme.colors.textSecondary} />
                    ) : (
                        <>
                            <AntDesign name="google" size={20} color="#DB4437" />
                            <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text }}>
                                Continue with Google
                            </Text>
                        </>
                    )}
                </Pressable>

                {/* Divider */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                    <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
                    <Text style={{ marginHorizontal: 12, color: theme.colors.textSecondary, fontSize: 13 }}>or</Text>
                    <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
                </View>

                {/* Continue with email button */}
                {!emailExpanded && (
                    <Pressable
                        style={[styles.authButtonSecondary, { borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }]}
                        onPress={() => setEmailExpanded(true)}
                    >
                        <Ionicons name="mail-outline" size={18} color={theme.colors.text} />
                        <Text style={[styles.authButtonTextSecondary, { fontSize: 16 }]}>
                            Continue with email
                        </Text>
                    </Pressable>
                )}

                {/* Email form (expanded) */}
                {emailExpanded && (
                    <View>
                        {/* Email field */}
                        <View style={{ marginBottom: 12 }}>
                            <Text style={{ fontSize: 14, fontWeight: '500', color: theme.colors.textSecondary, marginBottom: 6 }}>
                                Email
                            </Text>
                            <TextInput
                                style={[styles.nameModalInput, { fontSize: 16, paddingVertical: 12 }]}
                                placeholder="you@example.com"
                                placeholderTextColor={theme.colors.textSecondary}
                                value={email}
                                onChangeText={(v) => { setEmail(v); setAuthError(null); setForgotPasswordSent(false); }}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                autoComplete="email"
                                returnKeyType="next"
                            />
                            {authError?.field === 'email' && (
                                <Text style={[styles.nameModalError, { marginTop: 4 }]}>{authError.message}</Text>
                            )}
                        </View>

                        {/* Password field */}
                        <View style={{ marginBottom: 6 }}>
                            <Text style={{ fontSize: 14, fontWeight: '500', color: theme.colors.textSecondary, marginBottom: 6 }}>
                                Password
                            </Text>
                            <View style={[styles.nameModalInput, { flexDirection: 'row', alignItems: 'center', paddingVertical: 0 }]}>
                                <TextInput
                                    style={{ flex: 1, fontSize: 16, color: theme.colors.text, paddingVertical: 12 }}
                                    placeholder="Your password"
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
                                    Reset link sent to {email}
                                </Text>
                            ) : (
                                <Pressable onPress={handleForgotPassword}>
                                    <Text style={{ fontSize: 13, color: theme.colors.primary, fontWeight: '500' }}>
                                        Forgot password?
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
                            disabled={isLoading || isGoogleLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#ffffff" />
                            ) : (
                                <Text style={[styles.authButtonText, { fontSize: 16 }]}>Sign In</Text>
                            )}
                        </Pressable>
                    </View>
                )}

                {/* Create account link */}
                <Pressable
                    style={{ marginTop: 32, alignItems: 'center' }}
                    onPress={onGoToSignup}
                >
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 15 }}>
                        New here?{' '}
                        <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>
                            Create account
                        </Text>
                    </Text>
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
};
