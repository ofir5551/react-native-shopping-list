import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { styles } from '../styles/appStyles';

type HeaderProps = {
  title: string;
  subtitle?: string;
  onClearAll?: () => void;
  onBack?: () => void;
};

export const Header = ({ title, subtitle, onClearAll, onBack }: HeaderProps) => (
  <View style={styles.header}>
    <View style={styles.headerRow}>
      <View style={styles.headerLeft}>
        {onBack ? (
          <Pressable style={styles.secondaryButton} onPress={onBack}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </Pressable>
        ) : null}
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
      </View>
      {onClearAll ? (
        <Pressable style={styles.clearButton} onPress={onClearAll}>
          <Text style={styles.clearButtonText}>Clear all</Text>
        </Pressable>
      ) : null}
    </View>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
  </View>
);
