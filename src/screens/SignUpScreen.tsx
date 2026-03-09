import React, { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Platform,
    SafeAreaView,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as ImagePicker from 'expo-image-picker';
import { useAppStyles } from '../styles/appStyles';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../supabase';

type AuthError = {
    field: 'name' | 'email' | 'password' | 'general';
    message: string;
} | null;

type SignUpScreenProps = {
    onBack: () => void;
    onGoToLogin: () => void;
    onSignUpSuccess: () => void;
    onLoginSuccess: () => void;
};

export const SignUpScreen = ({ onBack, onGoToLogin, onSignUpSuccess, onLoginSuccess }: SignUpScreenProps) => {
    const styles = useAppStyles();
    const { theme, isDark } = useTheme();
    const { showToast } = useToast();

    const [emailExpanded, setEmailExpanded] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [avatarUri, setAvatarUri] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [authError, setAuthError] = useState<AuthError>(null);

    const pickAvatar = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) return;

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setAvatarUri(result.assets[0].uri);
        }
    };

    const uploadAvatar = async (userId: string, uri: string): Promise<string | null> => {
        try {
            const response = await fetch(uri);
            const blob = await response.blob();
            const path = `public/${userId}.jpg`;

            const { error } = await supabase.storage
                .from('avatars')
                .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });

            if (error) return null;

            const { data } = supabase.storage.from('avatars').getPublicUrl(path);
            return data.publicUrl;
        } catch {
            return null;
        }
    };

    const handleSignUp = async () => {
        setAuthError(null);
        if (!name.trim()) {
            setAuthError({ field: 'name', message: 'Please enter your name.' });
            return;
        }
        if (!email.trim()) {
            setAuthError({ field: 'email', message: 'Please enter your email.' });
            return;
        }
        if (!password) {
            setAuthError({ field: 'password', message: 'Please enter a password.' });
            return;
        }
        if (password.length < 6) {
            setAuthError({ field: 'password', message: 'Password must be at least 6 characters.' });
            return;
        }

        setIsLoading(true);
        const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: { data: { display_name: name.trim() } },
        });

        if (error) {
            setIsLoading(false);
            setAuthError({ field: 'general', message: error.message });
            return;
        }

        // Upload avatar if selected (best-effort: silently skipped on failure)
        if (data.user && avatarUri) {
            try {
                const avatarUrl = await uploadAvatar(data.user.id, avatarUri);
                if (avatarUrl) {
                    await supabase.auth.updateUser({ data: { avatar_url: avatarUrl } });
                }
            } catch {
                // Avatar upload failed — account still created, proceed to success
            }
        }

        setIsLoading(false);
        showToast('Account created! Check your email to verify.');
        onSignUpSuccess();
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
                <TouchableOpacity
                    style={styles.iconButton}
                    onPress={onBack}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
                </TouchableOpacity>
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
                        Create Account
                    </Text>
                    <Text style={[styles.subtitle, { textAlign: 'center' }]}>
                        Join to sync and share lists across your devices
                    </Text>
                </View>

                {/* Google hero button */}
                <TouchableOpacity
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
                </TouchableOpacity>

                {/* Divider */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                    <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
                    <Text style={{ marginHorizontal: 12, color: theme.colors.textSecondary, fontSize: 13 }}>or</Text>
                    <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
                </View>

                {/* Continue with email button */}
                {!emailExpanded && (
                    <TouchableOpacity
                        style={[styles.authButtonSecondary, { borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }]}
                        onPress={() => setEmailExpanded(true)}
                    >
                        <Ionicons name="mail-outline" size={18} color={theme.colors.text} />
                        <Text style={[styles.authButtonTextSecondary, { fontSize: 16 }]}>
                            Continue with email
                        </Text>
                    </TouchableOpacity>
                )}

                {/* Email form (expanded) */}
                {emailExpanded && (
                    <View>
                        {/* Avatar picker */}
                        <View style={{ alignItems: 'center', marginBottom: 20 }}>
                            <TouchableOpacity onPress={pickAvatar} style={{ position: 'relative' }}>
                                <View style={{
                                    width: 72,
                                    height: 72,
                                    borderRadius: 36,
                                    backgroundColor: theme.colors.surfaceHighlight,
                                    borderWidth: 2,
                                    borderColor: theme.colors.border,
                                    overflow: 'hidden',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    {avatarUri ? (
                                        <Image
                                            source={{ uri: avatarUri }}
                                            style={{ width: 72, height: 72 }}
                                        />
                                    ) : (
                                        <Ionicons name="person-outline" size={32} color={theme.colors.textSecondary} />
                                    )}
                                </View>
                                <View style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    right: 0,
                                    width: 22,
                                    height: 22,
                                    borderRadius: 11,
                                    backgroundColor: theme.colors.primary,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderWidth: 2,
                                    borderColor: theme.colors.background,
                                }}>
                                    <Ionicons name="add" size={14} color="#ffffff" />
                                </View>
                            </TouchableOpacity>
                            <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 6 }}>
                                Add photo (optional)
                            </Text>
                        </View>

                        {/* Name field */}
                        <View style={{ marginBottom: 12 }}>
                            <Text style={{ fontSize: 14, fontWeight: '500', color: theme.colors.textSecondary, marginBottom: 6 }}>
                                Name
                            </Text>
                            <TextInput
                                style={[styles.nameModalInput, { fontSize: 16, paddingVertical: 12 }]}
                                placeholder="Your name"
                                placeholderTextColor={theme.colors.textSecondary}
                                value={name}
                                onChangeText={(v) => { setName(v); setAuthError(null); }}
                                autoCapitalize="words"
                                autoComplete="name"
                                returnKeyType="next"
                            />
                            {authError?.field === 'name' && (
                                <Text style={[styles.nameModalError, { marginTop: 4 }]}>{authError.message}</Text>
                            )}
                        </View>

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
                                onChangeText={(v) => { setEmail(v); setAuthError(null); }}
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
                        <View style={{ marginBottom: 20 }}>
                            <Text style={{ fontSize: 14, fontWeight: '500', color: theme.colors.textSecondary, marginBottom: 6 }}>
                                Password
                            </Text>
                            <View style={[styles.nameModalInput, { flexDirection: 'row', alignItems: 'center', paddingVertical: 0 }]}>
                                <TextInput
                                    style={{ flex: 1, fontSize: 16, color: theme.colors.text, paddingVertical: 12 }}
                                    placeholder="At least 6 characters"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={password}
                                    onChangeText={(v) => { setPassword(v); setAuthError(null); }}
                                    secureTextEntry={!showPassword}
                                    autoComplete="new-password"
                                    returnKeyType="done"
                                    onSubmitEditing={handleSignUp}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ paddingHorizontal: 8 }}>
                                    <Ionicons
                                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                        size={20}
                                        color={theme.colors.textSecondary}
                                    />
                                </TouchableOpacity>
                            </View>
                            {authError?.field === 'password' && (
                                <Text style={[styles.nameModalError, { marginTop: 4 }]}>{authError.message}</Text>
                            )}
                        </View>

                        {/* General error */}
                        {authError?.field === 'general' && (
                            <Text style={[styles.nameModalError, { marginBottom: 12, textAlign: 'center' }]}>
                                {authError.message}
                            </Text>
                        )}

                        {/* Create Account button */}
                        <TouchableOpacity
                            style={[styles.authButton, { borderRadius: 14, paddingVertical: 14, marginVertical: 0 }]}
                            onPress={handleSignUp}
                            disabled={isLoading || isGoogleLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#ffffff" />
                            ) : (
                                <Text style={[styles.authButtonText, { fontSize: 16 }]}>Create Account</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* Sign in link */}
                <TouchableOpacity
                    style={{ marginTop: 32, alignItems: 'center' }}
                    onPress={onGoToLogin}
                >
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 15 }}>
                        Already have an account?{' '}
                        <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>
                            Sign In
                        </Text>
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};
