import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useAppStyles } from '../styles/appStyles';
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

export const SavedSetModal = ({
  visible,
  savedSet,
  onClose,
  onAddSelected,
  onQuickAdd,
  onUpdateSet,
}: SavedSetModalProps) => {
  const styles = useAppStyles();
  const [items, setItems] = useState<SetItem[]>([]);

  useEffect(() => {
    if (visible && savedSet) {
      setItems(savedSet.items.map((i) => ({ ...i, selected: true })));
    } else {
      setItems([]);
    }
  }, [visible, savedSet]);

  const handleToggleSelect = (index: number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], selected: !next[index].selected };
      return next;
    });
  };

  const handleUpdateQuantity = (index: number, delta: number) => {
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
              <Ionicons name="close" size={18} color="#4a4a4a" />
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}>
            {items.length === 0 ? (
              <Text style={{ textAlign: 'center', color: '#8b8b8b', marginTop: 20 }}>
                This set has no items.
              </Text>
            ) : (
              items.map((item, index) => (
                <View
                  key={index}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: '#f0f0f0',
                  }}
                >
                  <Pressable
                    style={{ paddingRight: 12 }}
                    onPress={() => handleToggleSelect(index)}
                  >
                    <Ionicons
                      name={item.selected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={24}
                      color={item.selected ? '#007AFF' : '#d1d1d6'}
                    />
                  </Pressable>

                  <Text style={{ flex: 1, fontSize: 16, color: '#333' }}>
                    {item.name}
                  </Text>

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#f2f2f7',
                      borderRadius: 8,
                      overflow: 'hidden',
                    }}
                  >
                    <Pressable
                      style={{ padding: 8, paddingHorizontal: 12 }}
                      onPress={() => handleUpdateQuantity(index, -1)}
                    >
                      <Feather name="minus" size={16} color="#007AFF" />
                    </Pressable>
                    <Text
                      style={{
                        fontWeight: '600',
                        minWidth: 20,
                        textAlign: 'center',
                        color: '#333',
                      }}
                    >
                      {item.quantity}
                    </Text>
                    <Pressable
                      style={{ padding: 8, paddingHorizontal: 12 }}
                      onPress={() => handleUpdateQuantity(index, 1)}
                    >
                      <Feather name="plus" size={16} color="#007AFF" />
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          <View style={{ padding: 16, borderTopWidth: 1, borderColor: '#f0f0f0', gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: '#f2f2f7',
                  alignItems: 'center',
                }}
                onPress={onClose}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#ff3b30' }}>Cancel</Text>
              </Pressable>

              <Pressable
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: selectedCount === 0 ? '#b0d1ff' : '#007AFF',
                  alignItems: 'center',
                }}
                disabled={selectedCount === 0}
                onPress={() => onAddSelected(getSelectedItems())}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#ffffff' }}>Add</Text>
              </Pressable>
            </View>

            <Pressable
              style={{
                padding: 14,
                borderRadius: 12,
                backgroundColor: selectedCount === 0 ? '#e5e5ea' : '#34C759',
                alignItems: 'center',
              }}
              disabled={selectedCount === 0}
              onPress={() => onQuickAdd(getSelectedItems())}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: selectedCount === 0 ? '#a1a1aa' : '#ffffff',
                }}
              >
                Quick Add ({selectedCount})
              </Text>
            </Pressable>

            <Pressable
              style={{
                padding: 14,
                borderRadius: 12,
                backgroundColor: '#f2f2f7',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#007AFF',
              }}
              onPress={() => {
                if (savedSet) {
                  onUpdateSet(
                    savedSet.id,
                    items.map(({ name, quantity }) => ({ name, quantity }))
                  );
                }
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#007AFF' }}>
                Update Set
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
