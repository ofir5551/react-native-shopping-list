import React from 'react';
import { Pressable, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStyles } from '../styles/appStyles';
import { useTheme } from '../context/ThemeContext';

type FabProps = {
  mode: 'add' | 'confirm';
  onPress: () => void;
  onCaretPress?: () => void;
  style?: ViewStyle;
};

export const Fab = ({ mode, onPress, onCaretPress, style }: FabProps) => {
  const styles = useAppStyles();
  const { theme } = useTheme();

  if (mode === 'confirm' || !onCaretPress) {
    return (
      <Pressable
        style={({ pressed }) => [styles.fabConfirm, style, pressed && { opacity: 0.85 }]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={mode === 'confirm' ? 'Save selected items to list' : 'Create new list'}
      >
        <Ionicons name={mode === 'confirm' ? 'checkmark' : 'add'} size={28} color={theme.colors.primaryText} />
      </Pressable>
    );
  }

  return (
    <View style={[styles.fabPill, style]}>
      <Pressable
        style={({ pressed }) => [styles.fabPillLeft, pressed && { opacity: 0.85 }]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Add items"
      >
        <Ionicons name="add" size={20} color={theme.colors.primaryText} />
        <Text style={styles.fabPillLeftText}>Add</Text>
      </Pressable>
      <View style={styles.fabDivider} />
      <Pressable
        style={({ pressed }) => [styles.fabPillRight, pressed && { opacity: 0.85 }]}
        onPress={onCaretPress}
        accessibilityRole="button"
        accessibilityLabel="More add options"
      >
        <Ionicons name="chevron-up" size={18} color={theme.colors.primaryText} />
      </Pressable>
    </View>
  );
};
