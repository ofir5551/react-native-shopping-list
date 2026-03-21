import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppStyles } from '../styles/appStyles';
import { useTheme } from '../context/ThemeContext';
import { SavedSet, SavedSetItem } from '../types';

type SavedSetModalProps = {
  visible: boolean;
  savedSet: SavedSet | null;
  onClose: () => void;
  onAddAllToList: (items: { name: string; quantity: number }[]) => void;
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
  onAddAllToList,
  onUpdateSet,
}: SavedSetModalProps) => {
  const styles = useAppStyles();
  const { theme } = useTheme();
  const [items, setItems] = useState<SavedSetItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible && savedSet) {
      setItems(savedSet.items.map((i) => ({ ...i })));
      setNewItemName('');
    } else {
      setItems([]);
      setNewItemName('');
    }
  }, [visible, savedSet]);

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

  const handleRemoveItem = (index: number) => {
    triggerHaptic();
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddItem = () => {
    const name = newItemName.trim();
    if (!name) return;
    triggerHaptic();
    setItems((prev) => [...prev, { name, quantity: 1 }]);
    setNewItemName('');
    inputRef.current?.focus();
  };

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
            {items.map((item, index) => (
              <View
                key={index}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.border,
                }}
              >
                <Pressable
                  style={{ paddingRight: 12, minWidth: 36, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
                  onPress={() => handleRemoveItem(index)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${item.name} from set`}
                >
                  <Feather name="trash-2" size={16} color={theme.colors.danger} />
                </Pressable>

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
              </View>
            ))}

            {/* Add new item row */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 10,
                gap: 8,
              }}
            >
              <TextInput
                ref={inputRef}
                style={{
                  flex: 1,
                  fontSize: 15,
                  color: theme.colors.text,
                  paddingVertical: 8,
                  paddingHorizontal: 4,
                }}
                placeholder="Add item…"
                placeholderTextColor={theme.colors.textSecondary}
                value={newItemName}
                onChangeText={setNewItemName}
                onSubmitEditing={handleAddItem}
                returnKeyType="done"
                blurOnSubmit={false}
              />
              <Pressable
                style={({ pressed }) => ({
                  minWidth: 44,
                  minHeight: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed || !newItemName.trim() ? 0.4 : 1,
                })}
                onPress={handleAddItem}
                disabled={!newItemName.trim()}
                accessibilityRole="button"
                accessibilityLabel="Add item to set"
              >
                <Ionicons name="add-circle" size={26} color={theme.colors.primary} />
              </Pressable>
            </View>
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
                  borderColor: items.length === 0 ? theme.colors.border : theme.colors.primary,
                  alignItems: 'center' as const,
                  opacity: pressed ? 0.7 : 1,
                })}
                disabled={items.length === 0}
                onPress={() => {
                  if (savedSet) {
                    onUpdateSet(savedSet.id, items);
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel="Save set"
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: items.length === 0 ? theme.colors.textSecondary : theme.colors.primary }}>
                  Save Set
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => ({
                padding: 14,
                borderRadius: 12,
                backgroundColor: items.length === 0 ? theme.colors.surfaceHighlight : theme.colors.primary,
                alignItems: 'center' as const,
                opacity: pressed ? 0.7 : 1,
              })}
              disabled={items.length === 0}
              onPress={() => {
                triggerHaptic();
                onAddAllToList(items.map(({ name, quantity }) => ({ name, quantity })));
              }}
              accessibilityRole="button"
              accessibilityLabel={`Add all ${items.length} items to list`}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: items.length === 0 ? theme.colors.textSecondary : theme.colors.primaryText,
                }}
              >
                Add {items.length} Items to List
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
