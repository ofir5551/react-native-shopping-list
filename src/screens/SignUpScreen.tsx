import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
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
import * as ImagePicker from 'expo-image-picker';
import { useAppStyles } from '../styles/appStyles';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useLocale } from '../i18n/LocaleContext';
import { supabase } from '../supabase';

type AuthError = {
    field: 'name' | 'email' | 'password' | 'general';
    message: string;
} | null;

type SignUpScreenProps = {
    onBack: () => void;
    onGoToLogin: () => void;
    onSignUpSuccess: () => void;
};

export const SignUpScreen = ({ onBack, onGoToLogin, onSignUpSuccess }: SignUpScreenProps) => {
    const styles = useAppStyles();
    const { theme, isDark } = useTheme();
    const { showToast } = useToast();
    const { t, isRTL } = useLocale();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [avatarUri, setAvatarUri] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [authError, setAuthError] = useState<AuthError>(null);

    const launchLibrary = async () => {
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

    const launchCamera = async () => {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) return;
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
            setAvatarUri(result.assets[0].uri);
        }
    };

    const pickAvatar = () => {
        Alert.alert(
            t('signup.photoSourceTitle'),
            undefined,
            [
                { text: t('signup.takePhoto'), onPress: launchCamera },
                { text: t('signup.chooseFromLibrary'), onPress: launchLibrary },
                { text: t('common.cancel'), style: 'cancel' },
            ],
        );
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
            setAuthError({ field: 'name', message: t('signup.errorName') });
            return;
        }
        if (!email.trim()) {
            setAuthError({ field: 'email', message: t('signup.errorEmail') });
            return;
        }
        if (!password) {
            setAuthError({ field: 'password', message: t('signup.errorPassword') });
            return;
        }
        if (password.length < 6) {
            setAuthError({ field: 'password', message: t('signup.errorPasswordLength') });
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
        showToast(t('signup.accountCreated'));
        onSignUpSuccess();
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
                        {t('signup.createAccount')}
                    </Text>

                    {/* Avatar picker */}
                    <View style={{ alignItems: 'center', marginBottom: 20 }}>
                        <Pressable onPress={pickAvatar} style={{ position: 'relative' }}>
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
                        </Pressable>
                        <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 6 }}>
                            {t('signup.addPhoto')}
                        </Text>
                    </View>

                    {/* Name field */}
                    <View style={{ marginBottom: 12 }}>
                        <Text style={{ fontSize: 14, fontWeight: '500', color: theme.colors.textSecondary, marginBottom: 6 }}>
                            {t('signup.nameLabel')}
                        </Text>
                        <TextInput
                            style={[styles.nameModalInput, { fontSize: 16, paddingVertical: 12 }]}
                            placeholder={t('signup.namePlaceholder')}
                            placeholderTextColor={theme.colors.textSecondary}
                            value={name}
                            onChangeText={(v) => { setName(v); setAuthError(null); }}
                            autoCapitalize="words"
                            autoComplete="name"
                            returnKeyType="next"
                            autoFocus
                        />
                        {authError?.field === 'name' && (
                            <Text style={[styles.nameModalError, { marginTop: 4 }]}>{authError.message}</Text>
                        )}
                    </View>

                    {/* Email field */}
                    <View style={{ marginBottom: 12 }}>
                        <Text style={{ fontSize: 14, fontWeight: '500', color: theme.colors.textSecondary, marginBottom: 6 }}>
                            {t('signup.emailLabel')}
                        </Text>
                        <TextInput
                            style={[styles.nameModalInput, { fontSize: 16, paddingVertical: 12 }]}
                            placeholder={t('signup.emailPlaceholder')}
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
                            {t('signup.passwordLabel')}
                        </Text>
                        <View style={[styles.nameModalInput, { flexDirection: 'row', alignItems: 'center', paddingVertical: 0 }]}>
                            <TextInput
                                style={{ flex: 1, fontSize: 16, color: theme.colors.text, paddingVertical: 12 }}
                                placeholder={t('signup.passwordPlaceholder')}
                                placeholderTextColor={theme.colors.textSecondary}
                                value={password}
                                onChangeText={(v) => { setPassword(v); setAuthError(null); }}
                                secureTextEntry={!showPassword}
                                autoComplete="new-password"
                                returnKeyType="done"
                                onSubmitEditing={handleSignUp}
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

                    {/* General error */}
                    {authError?.field === 'general' && (
                        <Text style={[styles.nameModalError, { marginBottom: 12, textAlign: 'center' }]}>
                            {authError.message}
                        </Text>
                    )}

                    {/* Create Account button */}
                    <Pressable
                        style={[styles.authButton, { borderRadius: 14, paddingVertical: 14, marginVertical: 0 }]}
                        onPress={handleSignUp}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text style={[styles.authButtonText, { fontSize: 16 }]}>{t('signup.createAccountButton')}</Text>
                        )}
                    </Pressable>

                    {/* Sign in link */}
                    <Pressable
                        style={{ marginTop: 32, alignItems: 'center' }}
                        onPress={onGoToLogin}
                    >
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 15 }}>
                            {t('signup.alreadyHaveAccount')}{' '}
                            <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>
                                {t('signup.signIn')}
                            </Text>
                        </Text>
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};
