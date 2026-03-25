import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, Text } from 'react-native';
import { useTheme } from './ThemeContext';

type ToastContextType = {
    showToast: (message: string) => void;
};

const ToastContext = createContext<ToastContextType>({ showToast: () => { } });

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { theme } = useTheme();
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
            }, 2000);
        },
        [opacity]
    );

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {message ? (
                <Animated.View
                    style={[{
                        position: 'absolute',
                        bottom: 80,
                        left: 24,
                        right: 24,
                        backgroundColor: theme.colors.surface,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        borderRadius: theme.borderRadius.md,
                        paddingVertical: 14,
                        paddingHorizontal: 20,
                        alignItems: 'center',
                        zIndex: 9999,
                        elevation: 10,
                    }, { opacity }]}
                    pointerEvents="none"
                >
                    <Text style={{
                        color: theme.colors.text,
                        fontSize: 14,
                        fontFamily: theme.fonts.semibold,
                        textAlign: 'center',
                    }}>{message}</Text>
                </Animated.View>
            ) : null}
        </ToastContext.Provider>
    );
};
