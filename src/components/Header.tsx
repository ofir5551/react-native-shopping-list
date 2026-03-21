import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStyles } from '../styles/appStyles';
import { useTheme } from '../context/ThemeContext';

type HeaderProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onOpenSettings?: () => void;
  children?: React.ReactNode;
};

export const Header = ({
  title,
  subtitle,
  onBack,
  onOpenSettings,
  children,
}: HeaderProps) => {
  const styles = useAppStyles();
  const { theme } = useTheme();

  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          {onBack ? (
            <Pressable
              style={styles.overlayBackBtn}
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </Pressable>
          ) : null}
          <View>
            <Text numberOfLines={1} style={styles.title}>
              {title}
            </Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>
        <View style={styles.headerActions}>
          {onOpenSettings ? (
            <Pressable style={styles.iconButton} onPress={onOpenSettings}>
              <Ionicons name="settings-outline" size={20} color="#4a4a4a" />
            </Pressable>
          ) : null}
          {children}
        </View>
      </View>
    </View>
  );
};
