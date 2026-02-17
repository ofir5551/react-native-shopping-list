import React from 'react';
import { Text, View } from 'react-native';
import { useAppStyles } from '../styles/appStyles';

type EmptyStateProps = {
  title?: string;
  subtitle?: string;
};

export const EmptyState = ({
  title = 'Your list is empty',
  subtitle = 'Add your first item to get started.',
}: EmptyStateProps) => {
  const styles = useAppStyles();
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  );
};
