import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStyles } from '../styles/appStyles';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../i18n/LocaleContext';

type HeaderProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onOpenSettings?: () => void;
  settingsIcon?: 'settings' | 'options';
  children?: React.ReactNode;
};

export const Header = ({
  title,
  subtitle,
  onBack,
  onOpenSettings,
  settingsIcon = 'settings',
  children,
}: HeaderProps) => {
  const styles = useAppStyles();
  const { theme } = useTheme();
  const { t, isRTL } = useLocale();

  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          {onBack ? (
            <Pressable
              style={styles.overlayBackBtn}
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel={t('header.goBack')}
            >
              <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={theme.colors.text} />
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
          {children}
          {onOpenSettings ? (
            <Pressable style={styles.iconButton} onPress={onOpenSettings}>
              <Ionicons name={settingsIcon === 'options' ? 'ellipsis-vertical' : 'settings-outline'} size={20} color={theme.colors.textSecondary} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
};
