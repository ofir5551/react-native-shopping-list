import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles/appStyles';

type HeaderProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onOpenSettings?: () => void;
};

export const Header = ({
  title,
  subtitle,
  onBack,
  onOpenSettings,
}: HeaderProps) => (
  <View style={styles.header}>
    <View style={styles.headerRow}>
      <View style={styles.headerLeft}>
        {onBack ? (
          <Pressable
            style={styles.iconButton}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={20} color="#4a4a4a" />
          </Pressable>
        ) : null}
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
      </View>
      <View style={styles.headerActions}>
        {onOpenSettings ? (
          <Pressable style={styles.iconButton} onPress={onOpenSettings}>
            <Ionicons name="settings-outline" size={20} color="#4a4a4a" />
          </Pressable>
        ) : null}
      </View>
    </View>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
  </View>
);
