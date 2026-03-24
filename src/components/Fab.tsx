import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStyles } from '../styles/appStyles';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../i18n/LocaleContext';

type FabProps = {
  mode: 'add' | 'confirm';
  onPress: () => void;
  onCaretPress?: () => void;
  isCaretOpen?: boolean;
  style?: ViewStyle;
};

export const Fab = ({ mode, onPress, onCaretPress, isCaretOpen = false, style }: FabProps) => {
  const styles = useAppStyles();
  const { theme } = useTheme();
  const { t } = useLocale();
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(rotateAnim, {
      toValue: isCaretOpen ? 1 : 0,
      tension: 300,
      friction: 15,
      useNativeDriver: true,
    }).start();
  }, [isCaretOpen]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  if (mode === 'confirm' || !onCaretPress) {
    return (
      <Pressable
        style={({ pressed }) => [styles.fabConfirm, style, pressed && { opacity: 0.85 }]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={mode === 'confirm' ? t('fab.saveSelected') : t('fab.createNewList')}
      >
        <Ionicons name={mode === 'confirm' ? 'checkmark' : 'add'} size={28} color={theme.colors.primaryText} />
      </Pressable>
    );
  }

  return (
    <View style={[styles.fabPill, style, isCaretOpen && { zIndex: 20 }]}>
      <Pressable
        style={({ pressed }) => [styles.fabPillLeft, pressed && { opacity: 0.85 }]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t('fab.addItems')}
      >
        <Ionicons name="add" size={20} color={theme.colors.primaryText} />
        <Text style={styles.fabPillLeftText}>{t('fab.add')}</Text>
      </Pressable>
      <View style={styles.fabDivider} />
      <Pressable
        style={({ pressed }) => [styles.fabPillRight, pressed && { opacity: 0.85 }]}
        onPress={onCaretPress}
        accessibilityRole="button"
        accessibilityLabel={isCaretOpen ? t('fab.closeMenu') : t('fab.moreOptions')}
      >
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <Ionicons name="chevron-up" size={18} color={theme.colors.primaryText} />
        </Animated.View>
      </Pressable>
    </View>
  );
};
