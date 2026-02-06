import React, { useRef } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { styles } from '../styles/appStyles';
import { getTagColor } from '../utils/recents';

type OverlayModalProps = {
  visible: boolean;
  overlayInput: string;
  onChangeInput: (value: string) => void;
  onAddInput: () => void;
  recentItems: string[];
  selectedRecent: string[];
  onToggleRecent: (name: string) => void;
  onAddSelected: () => void;
  onClose: () => void;
};

export const OverlayModal = ({
  visible,
  overlayInput,
  onChangeInput,
  onAddInput,
  recentItems,
  selectedRecent,
  onToggleRecent,
  onAddSelected,
  onClose,
}: OverlayModalProps) => {
  const inputRef = useRef<TextInput | null>(null);

  const handleAdd = () => {
    onAddInput();
    inputRef.current?.focus();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalPanel}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add items</Text>
            <Pressable onPress={onClose} style={styles.modalCloseButton}>
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>

          <View style={styles.modalContent}>
            <View style={[styles.inputRow, styles.modalInputRow]}>
              <TextInput
                ref={inputRef}
                placeholder="Type an item..."
                value={overlayInput}
                onChangeText={onChangeInput}
                onSubmitEditing={handleAdd}
                blurOnSubmit={false}
                returnKeyType="done"
                style={styles.input}
                placeholderTextColor="#8b8b8b"
              />
              <Pressable style={styles.addButton} onPress={handleAdd}>
                <Text style={styles.addButtonText}>Add</Text>
              </Pressable>
            </View>

            <View style={styles.recentsHeader}>
              <Text style={styles.recentsTitle}>Recent</Text>
              <Text style={styles.recentsHint}>
                Tap to select items to add
              </Text>
            </View>

            {recentItems.length === 0 ? (
              <Text style={styles.recentsEmpty}>No recent items yet.</Text>
            ) : (
              <ScrollView
                style={styles.recentsScroll}
                contentContainerStyle={styles.tagsWrap}
                showsVerticalScrollIndicator={false}
              >
                {recentItems.map((item) => {
                  const isSelected = selectedRecent.includes(item);
                  const color = getTagColor(item);
                  return (
                    <Pressable
                      key={item}
                      onPress={() => onToggleRecent(item)}
                      style={[
                        styles.tag,
                        isSelected && {
                          backgroundColor: color,
                          borderColor: color,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tagText,
                          isSelected && styles.tagTextSelected,
                        ]}
                      >
                        {item}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>

          <Pressable
            style={[
              styles.addSelectedButton,
              selectedRecent.length === 0 && styles.addSelectedButtonDisabled,
            ]}
            onPress={onAddSelected}
            disabled={selectedRecent.length === 0}
          >
            <Text style={styles.addSelectedButtonText}>
              Add selected ({selectedRecent.length})
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};
