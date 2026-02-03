import React from 'react';
import { Text, View } from 'react-native';
import { styles } from '../styles/appStyles';

export const EmptyState = () => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyTitle}>Your list is empty</Text>
    <Text style={styles.emptySubtitle}>
      Add your first item to get started.
    </Text>
  </View>
);
