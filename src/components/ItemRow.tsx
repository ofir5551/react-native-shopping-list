import React, { useCallback, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ShoppingItem } from '../types';
import { useAppStyles } from '../styles/appStyles';

type ItemRowProps = {
  item: ShoppingItem;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
};

const CHECK_ANIM_DURATION = 300;

export const ItemRow = ({ item, onToggle, onDelete, onIncrement, onDecrement }: ItemRowProps) => {
  const styles = useAppStyles();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const isAnimating = useRef(false);
  const [checkedVisual, setCheckedVisual] = useState(false);

  const showChecked = item.purchased || checkedVisual;

  const handleToggle = useCallback(() => {
    if (isAnimating.current) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!item.purchased) {
      // Show checkbox as checked immediately
      setCheckedVisual(true);
      // Animate out before moving to completed
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

  return (
    <Pressable onPress={handleToggle}>
      <Animated.View style={[styles.listItem, { opacity: fadeAnim }]}>
        <View style={[styles.checkbox, showChecked && styles.checkboxChecked]}>
          {showChecked && <Text style={styles.checkmark}>✓</Text>}
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
            <Pressable style={styles.quantityButton} onPress={() => onDecrement(item.id)}>
              <Feather name="minus" size={14} color="#666" />
            </Pressable>
            <Text style={styles.quantityText}>{item.quantity}</Text>
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
          <Feather name="trash-2" size={16} color="#9a3d3d" />
        </Pressable>
      </Animated.View>
    </Pressable>
  );
};
