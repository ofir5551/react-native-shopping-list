import React, { memo, useCallback, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ShoppingItem } from '../types';
import { useAppStyles } from '../styles/appStyles';
import { useTheme } from '../context/ThemeContext';

type ItemRowProps = {
  item: ShoppingItem;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
};

const CHECK_ANIM_DURATION = 300;

export const ItemRow = memo(function ItemRow({ item, onToggle, onDelete, onIncrement, onDecrement }: ItemRowProps) {
  const styles = useAppStyles();
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const isAnimating = useRef(false);
  const [checkedVisual, setCheckedVisual] = useState(false);

  const showChecked = item.purchased || checkedVisual;

  const handleToggle = useCallback(() => {
    if (isAnimating.current) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!item.purchased) {
      setCheckedVisual(true);
      isAnimating.current = true;
      Animated.timing(fadeAnim, {
        toValue: 0.4,
        duration: CHECK_ANIM_DURATION,
        useNativeDriver: true,
      }).start(() => {
        isAnimating.current = false;
        fadeAnim.setValue(1);
        setCheckedVisual(false);
        onToggle(item.id);
      });
    } else {
      onToggle(item.id);
    }
  }, [item.id, item.purchased, onToggle, fadeAnim]);

  const handleDecrement = useCallback(() => onDecrement(item.id), [item.id, onDecrement]);
  const handleIncrement = useCallback(() => onIncrement(item.id), [item.id, onIncrement]);
  const handleDelete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDelete(item.id);
  }, [item.id, onDelete]);

  return (
    <Pressable onPress={handleToggle}>
      <Animated.View style={[styles.listItem, { opacity: fadeAnim }]}>
        <View style={[styles.checkbox, showChecked && styles.checkboxChecked]}>
          {showChecked ? <Text style={styles.checkmark}>✓</Text> : null}
        </View>

        <View style={styles.itemTextWrap}>
          <Text
            style={[
              styles.itemText,
              showChecked && styles.itemTextPurchased,
            ]}
          >
            {item.name}
          </Text>
        </View>

        {!item.purchased && (
          <View style={styles.quantityWrap}>
            <Pressable style={styles.quantityButton} onPress={handleDecrement}>
              <Feather name="minus" size={14} color={theme.colors.textSecondary} />
            </Pressable>
            <Pressable onPress={() => {}}><Text style={styles.quantityText}>{item.quantity}</Text></Pressable>
            <Pressable style={styles.quantityButton} onPress={handleIncrement}>
              <Feather name="plus" size={14} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
        )}

        {item.purchased && (item.quantity > 1) && (
          <View style={styles.quantityWrap}>
            <Pressable onPress={() => {}}><Text style={styles.quantityText}>{item.quantity}</Text></Pressable>
          </View>
        )}

        <Pressable style={styles.deleteButton} onPress={handleDelete}>
          <Feather name="trash-2" size={16} color={theme.colors.danger} />
        </Pressable>
      </Animated.View>
    </Pressable>
  );
});
