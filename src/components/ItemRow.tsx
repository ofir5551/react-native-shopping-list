import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ShoppingItem } from '../types';
import { useAppStyles } from '../styles/appStyles';

// ... imports

type ItemRowProps = {
  item: ShoppingItem;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
};

export const ItemRow = ({ item, onToggle, onDelete }: ItemRowProps) => {
  const styles = useAppStyles();
  return (
    <View style={styles.listItem}>
      <Pressable
        style={[styles.checkbox, item.purchased && styles.checkboxChecked]}
        onPress={() => onToggle(item.id)}
      >
        {item.purchased && <Text style={styles.checkmark}>✓</Text>}
      </Pressable>

      <Pressable style={styles.itemTextWrap} onPress={() => onToggle(item.id)}>
        <Text
          style={[
            styles.itemText,
            item.purchased && styles.itemTextPurchased,
          ]}
        >
          {item.name}
        </Text>
      </Pressable>

      <Pressable style={styles.deleteButton} onPress={() => onDelete(item.id)}>
        <Feather name="trash-2" size={18} color="#9a3d3d" />
      </Pressable>
    </View>
  );
};
