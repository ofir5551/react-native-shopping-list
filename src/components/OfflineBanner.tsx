import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSync } from '../context/SyncContext';

/**
 * Renders a slim banner at the top of the screen when the authenticated user
 * is offline or has changes that haven't synced to the cloud yet.
 *
 * For unauthenticated users (LocalStorageProvider) isOnline is always true,
 * so this banner is never shown.
 */
export const OfflineBanner: React.FC = () => {
  const { isOnline, hasPendingSync } = useSync();

  if (isOnline && !hasPendingSync) return null;

  const message = isOnline
    ? 'Syncing pending changes…'
    : hasPendingSync
    ? 'Offline — changes will sync when reconnected'
    : 'Offline';

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#7a4f1f',
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
});
