import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ActivityIndicator, Alert, Platform } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useAppStyles } from '../styles/appStyles';
import { supabase } from '../supabase';

WebBrowser.maybeCompleteAuthSession();

type AuthModalProps = {
    visible: boolean;
    onClose: () => void;
};

export const AuthModal: React.FC<AuthModalProps> = ({ visible, onClose }) => {
    const styles = useAppStyles();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [isLogin, setIsLogin] = useState(true);

    const handleAuth = async () => {
        setIsLoading(true);
        let error;

        if (isLogin) {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            error = signInError;
        } else {
            const { error: signUpError } = await supabase.auth.signUp({
                email,
                password,
            });
            error = signUpError;
        }

        setIsLoading(false);

        if (error) {
            Alert.alert('Authentication Error', error.message);
        } else {
            onClose();
        }
    };

    const handleGoogleSignIn = async () => {
        setIsGoogleLoading(true);
        try {
            if (Platform.OS === 'web') {
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: window.location.origin },
                });
                if (error) throw error;
                // Page will redirect to Google — no need to close modal
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
                        onClose();
                    }
                }
            }
        } catch (err: any) {
            Alert.alert('Authentication Error', err.message);
        } finally {
            setIsGoogleLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={[styles.container, { padding: 20, justifyContent: 'center' }]}>
                <Text style={[styles.title, { marginBottom: 20, textAlign: 'center' }]}>
                    {isLogin ? 'Welcome Back' : 'Create Account'}
                </Text>

                <TouchableOpacity
                    style={[styles.authButtonSecondary, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20 }]}
                    onPress={handleGoogleSignIn}
                    disabled={isGoogleLoading}
                >
                    {isGoogleLoading ? (
                        <ActivityIndicator color="#555" />
                    ) : (
                        <>
                            <AntDesign name="google" size={18} color="#DB4437" />
                            <Text style={styles.authButtonTextSecondary}>Continue with Google</Text>
                        </>
                    )}
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                    <View style={{ flex: 1, height: 1, backgroundColor: '#ddd' }} />
                    <Text style={{ marginHorizontal: 12, color: '#888', fontSize: 13 }}>or</Text>
                    <View style={{ flex: 1, height: 1, backgroundColor: '#ddd' }} />
                </View>

                <TextInput
                    style={[styles.input, { marginBottom: 15 }]}
                    placeholder="Email"
                    placeholderTextColor="#888"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />

                <TextInput
                    style={[styles.input, { marginBottom: 20 }]}
                    placeholder="Password"
                    placeholderTextColor="#888"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />

                <TouchableOpacity style={styles.authButton} onPress={handleAuth} disabled={isLoading}>
                    {isLoading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.authButtonText}>{isLogin ? 'Sign In' : 'Sign Up'}</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={{ marginTop: 20, alignItems: 'center' }}
                    onPress={() => setIsLogin(!isLogin)}
                >
                    <Text style={{ color: '#007AFF' }}>
                        {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={{ marginTop: 30, alignItems: 'center' }}
                    onPress={onClose}
                >
                    <Text style={{ color: '#888' }}>Cancel</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
};
