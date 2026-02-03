import React from 'react';
import { Pressable, Text } from 'react-native';
import { styles } from '../styles/appStyles';

type FabProps = {
  onPress: () => void;
};

export const Fab = ({ onPress }: FabProps) => (
  <Pressable style={styles.fab} onPress={onPress}>
    <Text style={styles.fabIcon}>+</Text>
  </Pressable>
);
