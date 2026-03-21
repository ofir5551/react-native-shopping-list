import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStyles } from '../styles/appStyles';
import { useTheme } from '../context/ThemeContext';

type CaretPopoverProps = {
  onAiSuggestions: () => void;
  onSavedSets: () => void;
  onClose: () => void;
};

export const CaretPopover = ({
  onAiSuggestions,
  onSavedSets,
  onClose,
}: CaretPopoverProps) => {
  const styles = useAppStyles();
  const { theme } = useTheme();

  return (
    <>
      <Pressable
        style={styles.settingsPopoverBackdrop}
        onPress={onClose}
      />
      <View style={styles.caretPopover}>
        <View style={[styles.caretPopoverItem, styles.caretPopoverItemDisabled]}>
          <Ionicons name="camera-outline" size={20} color={theme.colors.text} />
          <Text style={styles.caretPopoverItemText}>From Photo</Text>
        </View>
        <View style={styles.settingsPopoverDivider} />
        <Pressable
          style={({ pressed }) => [styles.caretPopoverItem, pressed && { opacity: 0.7 }]}
          onPress={() => {
            onClose();
            onAiSuggestions();
          }}
          accessibilityRole="button"
          accessibilityLabel="AI Suggestions"
          android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
        >
          <Ionicons name="sparkles-outline" size={20} color={theme.colors.text} />
          <Text style={styles.caretPopoverItemText}>AI Suggestions</Text>
        </Pressable>
        <View style={styles.settingsPopoverDivider} />
        <Pressable
          style={({ pressed }) => [styles.caretPopoverItem, pressed && { opacity: 0.7 }]}
          onPress={() => {
            onClose();
            onSavedSets();
          }}
          accessibilityRole="button"
          accessibilityLabel="Saved Sets"
          android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
        >
          <Ionicons name="albums-outline" size={20} color={theme.colors.text} />
          <Text style={styles.caretPopoverItemText}>Saved Sets</Text>
        </Pressable>
      </View>
    </>
  );
};
