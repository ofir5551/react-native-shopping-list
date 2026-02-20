import React, { useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useAppStyles } from '../styles/appStyles';
import { getTagColor } from '../utils/recents';
import { SelectedRecentItem } from '../types';

type OverlayModalProps = {
  visible: boolean;
  overlayInput: string;
  onChangeInput: (value: string) => void;
  onAddInput: () => void;
  recentItems: string[];
  selectedRecent: SelectedRecentItem[];
  onToggleRecent: (name: string) => void;
  onUpdateRecentQuantity: (name: string, delta: number) => void;
  onAddSelected: () => void;
  onClose: () => void;
};

type OverlaySectionKey = 'recents' | 'smartSuggestion' | 'savedSets';

type OverlaySectionProps = {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

const OverlaySection = ({
  title,
  isExpanded,
  onToggle,
  children,
}: OverlaySectionProps) => {
  const styles = useAppStyles();
  return (
    <View style={styles.overlaySection}>
      <Pressable style={styles.overlaySectionHeader} onPress={onToggle}>
        <Text style={styles.overlaySectionTitle}>{title}</Text>
        <Text style={styles.overlaySectionChevron}>{isExpanded ? '−' : '+'}</Text>
      </Pressable>
      {isExpanded ? <View style={styles.overlaySectionBody}>{children}</View> : null}
    </View>
  );
};

export const OverlayModal = ({
  visible,
  overlayInput,
  onChangeInput,
  onAddInput,
  recentItems,
  selectedRecent,
  onToggleRecent,
  onUpdateRecentQuantity,
  onAddSelected,
  onClose,
}: OverlayModalProps) => {
  const styles = useAppStyles();
  const inputRef = useRef<TextInput | null>(null);
  const unselectedRecents = recentItems.filter(
    (item) => !selectedRecent.some((sel) => sel.name === item)
  );
  const [expandedSections, setExpandedSections] = useState<Record<OverlaySectionKey, boolean>>({
    recents: true,
    smartSuggestion: false,
    savedSets: false,
  });

  const handleAdd = () => {
    onAddInput();
    inputRef.current?.focus();
  };

  const toggleSection = (section: OverlaySectionKey) => {
    setExpandedSections((previous) => ({
      ...previous,
      [section]: !previous[section],
    }));
  };

  const addRecentToSelection = (item: string) => {
    if (selectedRecent.some((sel) => sel.name === item)) {
      return;
    }
    onToggleRecent(item);
  };

  const clearSelected = () => {
    selectedRecent.forEach((item) => onToggleRecent(item.name));
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
            <Pressable
              onPress={onClose}
              style={styles.modalCloseButton}
              accessibilityRole="button"
              accessibilityLabel="Close add items panel"
            >
              <Ionicons name="close" size={18} color="#4a4a4a" />
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
              <Pressable
                style={styles.addButton}
                onPress={handleAdd}
                accessibilityRole="button"
                accessibilityLabel="Add typed item"
              >
                <Ionicons name="add" size={20} color="#ffffff" />
              </Pressable>
            </View>

            <View style={styles.selectedTray}>
              <View style={styles.selectedTrayHeader}>
                <Text style={styles.selectedTrayTitle}>
                  Selected ({selectedRecent.length})
                </Text>
                {selectedRecent.length > 0 ? (
                  <Pressable
                    onPress={clearSelected}
                    style={styles.selectedClearButton}
                    accessibilityRole="button"
                    accessibilityLabel="Clear selected items"
                  >
                    <Ionicons name="close-circle-outline" size={18} color="#4a4a4a" />
                  </Pressable>
                ) : null}
              </View>
              {selectedRecent.length === 0 ? (
                <Text style={styles.selectedEmptyText}>
                  Pick items from Recents to build your selection.
                </Text>
              ) : (
                <View style={styles.tagsWrap}>
                  {selectedRecent.map((item) => {
                    const color = getTagColor(item.name);
                    return (
                      <View
                        key={item.name}
                        style={[
                          styles.tag,
                          styles.selectedTag,
                          {
                            backgroundColor: color,
                            borderColor: color,
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 4,
                            paddingHorizontal: 8,
                          },
                        ]}
                      >
                        <Pressable style={styles.quantityButton} onPress={() => onUpdateRecentQuantity(item.name, -1)}>
                          <Feather name="minus" size={14} color="#fff" />
                        </Pressable>
                        <Text style={[styles.tagText, styles.tagTextSelected, { marginHorizontal: 8 }]}>
                          {item.quantity}x {item.name}
                        </Text>
                        <Pressable style={styles.quantityButton} onPress={() => onUpdateRecentQuantity(item.name, 1)}>
                          <Feather name="plus" size={14} color="#fff" />
                        </Pressable>
                        <Pressable style={{ marginLeft: 6, padding: 4 }} onPress={() => onToggleRecent(item.name)}>
                          <Feather name="x" size={14} color="#fff" />
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <ScrollView
              style={styles.overlaySectionsScroll}
              contentContainerStyle={styles.overlaySectionsContent}
              showsVerticalScrollIndicator={false}
            >
              <OverlaySection
                title="Recent"
                isExpanded={expandedSections.recents}
                onToggle={() => toggleSection('recents')}
              >
                <Text style={styles.recentsHint}>Tap to add items to Selected</Text>
                {recentItems.length === 0 ? (
                  <Text style={styles.recentsEmpty}>No recent items yet.</Text>
                ) : unselectedRecents.length === 0 ? (
                  <Text style={styles.recentsEmpty}>All recents are already selected.</Text>
                ) : (
                  <View style={styles.tagsWrap}>
                    {unselectedRecents.map((item) => {
                      return (
                        <Pressable
                          key={item}
                          onPress={() => addRecentToSelection(item)}
                          style={styles.tag}
                        >
                          <Text style={styles.tagText}>{item}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </OverlaySection>

              <OverlaySection
                title="Smart suggestion"
                isExpanded={expandedSections.smartSuggestion}
                onToggle={() => toggleSection('smartSuggestion')}
              >
                <Text style={styles.overlayPlaceholderText}>
                  Smart suggestions will appear here soon.
                </Text>
              </OverlaySection>

              <OverlaySection
                title="Saved sets"
                isExpanded={expandedSections.savedSets}
                onToggle={() => toggleSection('savedSets')}
              >
                <Text style={styles.overlayPlaceholderText}>
                  Saved sets will appear here soon.
                </Text>
              </OverlaySection>
            </ScrollView>
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
