import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

type ToastContextType = {
    showToast: (message: string) => void;
};

const ToastContext = createContext<ToastContextType>({ showToast: () => { } });

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [message, setMessage] = useState('');
    const opacity = useRef(new Animated.Value(0)).current;
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showToast = useCallback(
        (msg: string) => {
            if (timerRef.current) clearTimeout(timerRef.current);
            setMessage(msg);
            Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
            timerRef.current = setTimeout(() => {
                Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }).start();
            }, 3500);
        },
        [opacity]
    );

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {message ? (
                <Animated.View style={[styles.toast, { opacity }]} pointerEvents="none">
                    <Text style={styles.text}>{message}</Text>
                </Animated.View>
            ) : null}
        </ToastContext.Provider>
    );
};

const styles = StyleSheet.create({
    toast: {
        position: 'absolute',
        bottom: 80,
        left: 24,
        right: 24,
        backgroundColor: '#333',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 20,
        alignItems: 'center',
        zIndex: 9999,
        elevation: 10,
    },
    text: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
});
