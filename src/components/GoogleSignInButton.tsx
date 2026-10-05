import React, { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { useAppStyles } from '../styles/appStyles';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useLocale } from '../i18n/LocaleContext';
import { supabase } from '../supabase';

WebBrowser.maybeCompleteAuthSession();

type GoogleSignInButtonProps = {
    onSuccess: () => void;
};

export const GoogleSignInButton = ({ onSuccess }: GoogleSignInButtonProps) => {
    const styles = useAppStyles();
    const { theme } = useTheme();
    const { showToast } = useToast();
    const { t } = useLocale();

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSignIn = async () => {
        setIsLoading(true);
        setError(null);
        try {
            if (Platform.OS === 'web') {
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: window.location.origin },
                });
                if (error) throw error;
            } else {
                const redirectUrl = makeRedirectUri();
                const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
                });
                if (error) throw error;
                if (data.url) {
                    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
                    if (result.type === 'success') {
                        const { params, errorCode } = QueryParams.getQueryParams(result.url);
                        if (errorCode) throw new Error(errorCode);
                        const { access_token, refresh_token } = params;
                        const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
                        if (sessionError) throw sessionError;
                        showToast(t('login.signedIn'));
                        onSuccess();
                    }
                }
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
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
                onPress={handleSignIn}
                disabled={isLoading}
                accessibilityRole="button"
            >
                {isLoading ? (
                    <ActivityIndicator color={theme.colors.textSecondary} />
                ) : (
                    <>
                        <AntDesign name="google" size={20} color="#DB4437" />
                        <Text style={{ fontSize: 16, fontFamily: theme.fonts.semibold, color: theme.colors.text }}>
                            {t('auth.continueWithGoogle')}
                        </Text>
                    </>
                )}
            </Pressable>
            {error && (
                <Text style={[styles.nameModalError, { marginBottom: 14, textAlign: 'center' }]}>
                    {error}
                </Text>
            )}
        </>
    );
};
