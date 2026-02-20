import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ActivityIndicator, Alert } from 'react-native';
import { useAppStyles } from '../styles/appStyles';
import { supabase } from '../supabase';

type AuthModalProps = {
    visible: boolean;
    onClose: () => void;
};

export const AuthModal: React.FC<AuthModalProps> = ({ visible, onClose }) => {
    const styles = useAppStyles();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
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

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={[styles.container, { padding: 20, justifyContent: 'center' }]}>
                <Text style={[styles.title, { marginBottom: 20, textAlign: 'center' }]}>
                    {isLogin ? 'Welcome Back' : 'Create Account'}
                </Text>

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
