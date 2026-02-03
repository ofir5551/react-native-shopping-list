import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { styles } from '../styles/appStyles';

type HeaderProps = {
  title: string;
  subtitle: string;
  onClearAll: () => void;
};

export const Header = ({ title, subtitle, onClearAll }: HeaderProps) => (
  <View style={styles.header}>
    <View style={styles.headerRow}>
      <Text style={styles.title}>{title}</Text>
      <Pressable style={styles.clearButton} onPress={onClearAll}>
        <Text style={styles.clearButtonText}>Clear all</Text>
      </Pressable>
    </View>
    <Text style={styles.subtitle}>{subtitle}</Text>
  </View>
);
