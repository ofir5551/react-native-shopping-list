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
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
};

export const ItemRow = ({ item, onToggle, onDelete, onIncrement, onDecrement }: ItemRowProps) => {
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

      {!item.purchased && (
        <View style={styles.quantityWrap}>
          <Pressable style={styles.quantityButton} onPress={() => onDecrement(item.id)}>
            <Feather name="minus" size={14} color="#666" />
          </Pressable>
          <Text style={styles.quantityText}>{item.quantity ?? 1}</Text>
          <Pressable style={styles.quantityButton} onPress={() => onIncrement(item.id)}>
            <Feather name="plus" size={14} color="#666" />
          </Pressable>
        </View>
      )}

      {item.purchased && (item.quantity > 1) && (
        <View style={styles.quantityWrap}>
          <Text style={styles.quantityText}>{item.quantity}</Text>
        </View>
      )}

      <Pressable style={styles.deleteButton} onPress={() => onDelete(item.id)}>
        <Feather name="trash-2" size={18} color="#9a3d3d" />
      </Pressable>
    </View>
  );
};
