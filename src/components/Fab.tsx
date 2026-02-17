import React from 'react';
import { Pressable, Text } from 'react-native';
import { useAppStyles } from '../styles/appStyles';

type FabProps = {
  onPress: () => void;
};

export const Fab = ({ onPress }: FabProps) => {
  const styles = useAppStyles();
  return (
    <Pressable style={styles.fab} onPress={onPress}>
      <Text style={styles.fabIcon}>+</Text>
    </Pressable>
  );
};
