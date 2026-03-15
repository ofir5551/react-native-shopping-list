import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppStyles } from '../styles/appStyles';
import { useTheme } from '../context/ThemeContext';
import { SavedSet, SavedSetItem } from '../types';

type SetItem = SavedSetItem & { selected: boolean };

type SavedSetModalProps = {
  visible: boolean;
  savedSet: SavedSet | null;
  onClose: () => void;
  onAddSelected: (items: { name: string; quantity: number }[]) => void;
  onQuickAdd: (items: { name: string; quantity: number }[]) => void;
  onUpdateSet: (setId: string, items: SavedSetItem[]) => void;
};

const triggerHaptic = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
};

export const SavedSetModal = ({
  visible,
  savedSet,
  onClose,
  onAddSelected,
  onQuickAdd,
  onUpdateSet,
}: SavedSetModalProps) => {
  const styles = useAppStyles();
  const { theme } = useTheme();
  const [items, setItems] = useState<SetItem[]>([]);

  useEffect(() => {
    if (visible && savedSet) {
      setItems(savedSet.items.map((i) => ({ ...i, selected: true })));
    } else {
      setItems([]);
    }
  }, [visible, savedSet]);

  const handleToggleSelect = (index: number) => {
    triggerHaptic();
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], selected: !next[index].selected };
      return next;
    });
  };

  const handleUpdateQuantity = (index: number, delta: number) => {
    triggerHaptic();
    setItems((prev) => {
      const next = [...prev];
      const newQty = next[index].quantity + delta;
      if (newQty > 0) {
        next[index] = { ...next[index], quantity: newQty };
      }
      return next;
    });
  };

  const getSelectedItems = () =>
    items.filter((i) => i.selected).map(({ name, quantity }) => ({ name, quantity }));

  const selectedCount = items.filter((i) => i.selected).length;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.modalPanel, { maxHeight: '85%' }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{savedSet?.name ?? 'Saved Set'}</Text>
            <Pressable onPress={onClose} style={styles.modalCloseButton}>
              <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}>
            {items.length === 0 ? (
              <Text style={{ textAlign: 'center', color: theme.colors.textSecondary, marginTop: 20 }}>
                This set has no items.
              </Text>
            ) : (
              items.map((item, index) => (
                <Pressable
                  key={index}
                  style={({ pressed }) => ({
                    flexDirection: 'row' as const,
                    alignItems: 'center' as const,
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.border,
                    opacity: pressed ? 0.7 : 1,
                  })}
                  onPress={() => handleToggleSelect(index)}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.selected ? 'Deselect' : 'Select'} ${item.name}`}
                  android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                >
                  <View style={{ paddingRight: 12 }}>
                    <Ionicons
                      name={item.selected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={24}
                      color={item.selected ? theme.colors.primary : theme.colors.border}
                    />
                  </View>

                  <Text style={{ flex: 1, fontSize: 16, color: theme.colors.text }}>
                    {item.name}
                  </Text>

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: theme.colors.surfaceHighlight,
                      borderRadius: 8,
                      overflow: 'hidden',
                    }}
                  >
                    <Pressable
                      style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
                      onPress={() => handleUpdateQuantity(index, -1)}
                      accessibilityLabel={`Decrease quantity for ${item.name}`}
                    >
                      <Feather name="minus" size={16} color={theme.colors.primary} />
                    </Pressable>
                    <Text
                      style={{
                        fontWeight: '600',
                        minWidth: 20,
                        textAlign: 'center',
                        color: theme.colors.text,
                      }}
                    >
                      {item.quantity}
                    </Text>
                    <Pressable
                      style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
                      onPress={() => handleUpdateQuantity(index, 1)}
                      accessibilityLabel={`Increase quantity for ${item.name}`}
                    >
                      <Feather name="plus" size={16} color={theme.colors.primary} />
                    </Pressable>
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>

          <View style={{ padding: 16, borderTopWidth: 1, borderColor: theme.colors.border, gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                style={({ pressed }) => ({
                  flex: 1,
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: theme.colors.surfaceHighlight,
                  alignItems: 'center' as const,
                  opacity: pressed ? 0.7 : 1,
                })}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.danger }}>Cancel</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => ({
                  flex: 1,
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: theme.colors.surfaceHighlight,
                  borderWidth: 1,
                  borderColor: selectedCount === 0 ? theme.colors.border : theme.colors.primary,
                  alignItems: 'center' as const,
                  opacity: pressed ? 0.7 : 1,
                })}
                disabled={selectedCount === 0}
                onPress={() => onAddSelected(getSelectedItems())}
                accessibilityRole="button"
                accessibilityLabel="Add selected items to selection"
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: selectedCount === 0 ? theme.colors.textSecondary : theme.colors.primary }}>
                  Add to Selection
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => ({
                padding: 14,
                borderRadius: 12,
                backgroundColor: selectedCount === 0 ? theme.colors.surfaceHighlight : theme.colors.primary,
                alignItems: 'center' as const,
                opacity: pressed ? 0.7 : 1,
              })}
              disabled={selectedCount === 0}
              onPress={() => {
                triggerHaptic();
                onQuickAdd(getSelectedItems());
              }}
              accessibilityRole="button"
              accessibilityLabel={`Add ${selectedCount} items to list`}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: selectedCount === 0 ? theme.colors.textSecondary : theme.colors.primaryText,
                }}
              >
                Add {selectedCount} Items to List
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => ({
                padding: 14,
                borderRadius: 12,
                backgroundColor: theme.colors.surfaceHighlight,
                alignItems: 'center' as const,
                borderWidth: 1,
                borderColor: theme.colors.primary,
                opacity: pressed ? 0.7 : 1,
              })}
              onPress={() => {
                if (savedSet) {
                  onUpdateSet(
                    savedSet.id,
                    items.map(({ name, quantity }) => ({ name, quantity }))
                  );
                }
              }}
              accessibilityRole="button"
              accessibilityLabel="Update this saved set"
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.primary }}>
                Update Set
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
