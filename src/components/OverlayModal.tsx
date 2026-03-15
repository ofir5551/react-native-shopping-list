import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAppStyles } from '../styles/appStyles';
import { useTheme } from '../context/ThemeContext';
import { getTagColor } from '../utils/recents';
import { SavedSet, SavedSetItem, SelectedRecentItem } from '../types';
import { SmartSuggestionsModal } from './SmartSuggestionsModal';
import { SavedSetModal } from './SavedSetModal';

type OverlayModalProps = {
  visible: boolean;
  overlayInput: string;
  onChangeInput: (value: string) => void;
  onAddInput: () => void;
  recentItems: string[];
  selectedRecent: SelectedRecentItem[];
  onToggleRecent: (name: string) => void;
  onUpdateRecentQuantity: (name: string, delta: number) => void;
  handleAddMultipleSelected: (items: { name: string; quantity: number }[]) => void;
  handleQuickAddMultiple: (items: { name: string; quantity: number }[]) => void;
  onAddSelected: () => void;
  onClose: () => void;
  savedSets: SavedSet[];
  onCreateSavedSet: (name: string, items: SavedSetItem[]) => void;
  onUpdateSavedSet: (setId: string, items: SavedSetItem[]) => void;
  onDeleteSavedSet: (setId: string) => void;
  overlayToast?: { message: string; key: number } | null;
};

type OverlaySectionKey = 'recents' | 'smartSuggestion' | 'savedSets';

type OverlaySectionProps = {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

const triggerHaptic = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
};

const OverlaySection = ({
  title,
  isExpanded,
  onToggle,
  children,
}: OverlaySectionProps) => {
  const styles = useAppStyles();
  const { theme } = useTheme();
  return (
    <View style={styles.overlaySection}>
      <Pressable
        style={styles.overlaySectionHeader}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
      >
        <Text style={styles.overlaySectionTitle}>{title}</Text>
        <Ionicons
          name={isExpanded ? 'chevron-down' : 'chevron-forward'}
          size={20}
          color={theme.colors.text}
          accessibilityElementsHidden={true}
        />
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
  handleAddMultipleSelected,
  handleQuickAddMultiple,
  onAddSelected,
  onClose,
  savedSets,
  onCreateSavedSet,
  onUpdateSavedSet,
  onDeleteSavedSet,
  overlayToast,
}: OverlayModalProps) => {
  const styles = useAppStyles();
  const { theme } = useTheme();
  const inputRef = useRef<TextInput | null>(null);
  const unselectedRecents = recentItems.filter(
    (item) => !selectedRecent.some((sel) => sel.name === item)
  );
  const [expandedSections, setExpandedSections] = useState<Record<OverlaySectionKey, boolean>>({
    recents: true,
    smartSuggestion: false,
    savedSets: false,
  });

  const [suggestPrompt, setSuggestPrompt] = useState('');
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);
  const [isSaveSetPromptOpen, setIsSaveSetPromptOpen] = useState(false);
  const [saveSetName, setSaveSetName] = useState('');
  const saveSetInputRef = useRef<TextInput | null>(null);
  const [activeSavedSet, setActiveSavedSet] = useState<SavedSet | null>(null);
  const [isSavedSetModalOpen, setIsSavedSetModalOpen] = useState(false);
  const [isKeyboardUp, setIsKeyboardUp] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const [toastText, setToastText] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardUp(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardUp(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!overlayToast) return;
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastText(overlayToast.message);
    Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastOpacity, { toValue: 0, duration: 350, useNativeDriver: true }).start();
    }, 2000);
  }, [overlayToast]);

  const handleOpenSuggestions = () => {
    if (suggestPrompt.trim()) {
      Keyboard.dismiss();
      setIsSuggestModalOpen(true);
    }
  };

  const handleAdd = () => {
    onAddInput();
    inputRef.current?.focus();
  };

  // Mutually exclusive: opening one section closes all others
  const toggleSection = (section: OverlaySectionKey) => {
    setExpandedSections((previous) => {
      const isCurrentlyOpen = previous[section];
      return {
        recents: false,
        smartSuggestion: false,
        savedSets: false,
        [section]: !isCurrentlyOpen,
      };
    });
  };

  const addRecentToSelection = (item: string) => {
    if (selectedRecent.some((sel) => sel.name === item)) {
      return;
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    triggerHaptic();
    onToggleRecent(item);
  };

  const handleRemoveFromSelection = (name: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    triggerHaptic();
    onToggleRecent(name);
  };

  const handleQuantityChange = (name: string, delta: number) => {
    triggerHaptic();
    onUpdateRecentQuantity(name, delta);
  };

  const clearSelected = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    selectedRecent.forEach((item) => onToggleRecent(item.name));
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      onShow={() => setTimeout(() => inputRef.current?.focus(), 100)}
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
              <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.modalContent}>
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
                          style={({ pressed }) => [styles.tag, pressed && { opacity: 0.7 }]}
                          accessibilityRole="button"
                          accessibilityLabel={`Add ${item} to selection`}
                          android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
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
                <Text style={{ fontSize: 14, color: theme.colors.textSecondary, marginBottom: 12 }}>
                  Type a prompt (e.g., "birthday party for 10 kids") to generate suggested items.
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, height: 44 }}>
                  <TextInput
                    placeholder="Enter prompt..."
                    value={suggestPrompt}
                    onChangeText={setSuggestPrompt}
                    onSubmitEditing={handleOpenSuggestions}
                    blurOnSubmit={false}
                    returnKeyType="go"
                    style={[styles.input, { flex: 1 }]}
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                  <Pressable
                    style={[styles.addButton, { backgroundColor: suggestPrompt.trim() ? theme.colors.primary : theme.colors.border }]}
                    onPress={handleOpenSuggestions}
                    disabled={!suggestPrompt.trim()}
                    accessibilityRole="button"
                    accessibilityLabel="Generate suggestions"
                  >
                    <Ionicons name="sparkles" size={20} color={theme.colors.primaryText} />
                  </Pressable>
                </View>
              </OverlaySection>

              <OverlaySection
                title="Saved sets"
                isExpanded={expandedSections.savedSets}
                onToggle={() => toggleSection('savedSets')}
              >
                {savedSets.length === 0 ? (
                  <Text style={styles.overlayPlaceholderText}>
                    No saved sets yet. Select items and tap "Save as set" to create one.
                  </Text>
                ) : (
                  savedSets.map((set) => (
                    <Pressable
                      key={set.id}
                      onPress={() => {
                        setActiveSavedSet(set);
                        setIsSavedSetModalOpen(true);
                      }}
                      style={({ pressed }) => ({
                        flexDirection: 'row' as const,
                        alignItems: 'center' as const,
                        paddingVertical: 10,
                        paddingHorizontal: 4,
                        borderBottomWidth: 1,
                        borderBottomColor: theme.colors.border,
                        opacity: pressed ? 0.7 : 1,
                      })}
                      accessibilityRole="button"
                      accessibilityLabel={`Open saved set ${set.name}`}
                      android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                    >
                      <Ionicons name="albums-outline" size={20} color={theme.colors.primary} style={{ marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, color: theme.colors.text, fontWeight: '500' }}>{set.name}</Text>
                        <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>{set.items.length} items</Text>
                      </View>
                      <Pressable
                        onPress={() => {
                          Alert.alert(
                            'Delete set?',
                            `Remove "${set.name}"? This cannot be undone.`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Delete', style: 'destructive', onPress: () => onDeleteSavedSet(set.id) },
                            ]
                          );
                        }}
                        style={{ padding: 10, minWidth: 44, minHeight: 44, alignItems: 'center' as const, justifyContent: 'center' as const }}
                        accessibilityRole="button"
                        accessibilityLabel={`Delete set ${set.name}`}
                      >
                        <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                      </Pressable>
                    </Pressable>
                  ))
                )}
              </OverlaySection>
            </ScrollView>

            {!isKeyboardUp && (<View style={styles.selectedTray}>
              <View style={styles.selectedTrayHeader}>
                <Text style={styles.selectedTrayTitle}>
                  Selected ({selectedRecent.length})
                </Text>
                {selectedRecent.length > 0 ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Pressable
                      onPress={() => {
                        setSaveSetName('');
                        setIsSaveSetPromptOpen(true);
                      }}
                      style={({ pressed }) => ({
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        backgroundColor: theme.colors.surfaceHighlight,
                        borderRadius: 6,
                        opacity: pressed ? 0.7 : 1,
                      })}
                      accessibilityRole="button"
                      accessibilityLabel="Save selected items as a set"
                    >
                      <Text style={{ fontSize: 12, color: theme.colors.primary, fontWeight: '600' }}>Save as set...</Text>
                    </Pressable>
                    <Pressable
                      onPress={clearSelected}
                      style={styles.selectedClearButton}
                      accessibilityRole="button"
                      accessibilityLabel="Clear selected items"
                    >
                      <Ionicons name="close-circle-outline" size={18} color={theme.colors.textSecondary} />
                    </Pressable>
                  </View>
                ) : null}
              </View>
              {selectedRecent.length === 0 ? (
                <Text style={styles.selectedEmptyText}>
                  Pick items from Recents to build your selection.
                </Text>
              ) : (
                <ScrollView style={{ maxHeight: 120 }} nestedScrollEnabled>
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
                          <Pressable
                            style={[styles.quantityButton, { padding: 4, alignItems: 'center' as const, justifyContent: 'center' as const }]}
                            onPress={() => handleQuantityChange(item.name, -1)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            accessibilityLabel={`Decrease quantity for ${item.name}`}
                            android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                          >
                            <Feather name="minus" size={12} color={theme.colors.primaryText} />
                          </Pressable>
                          <Text style={[styles.tagText, styles.tagTextSelected, { marginHorizontal: 4 }]}>
                            {item.quantity}x {item.name}
                          </Text>
                          <Pressable
                            style={[styles.quantityButton, { padding: 4, alignItems: 'center' as const, justifyContent: 'center' as const }]}
                            onPress={() => handleQuantityChange(item.name, 1)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            accessibilityLabel={`Increase quantity for ${item.name}`}
                            android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                          >
                            <Feather name="plus" size={12} color={theme.colors.primaryText} />
                          </Pressable>
                          <Pressable
                            style={{ marginLeft: 4, padding: 4, alignItems: 'center' as const, justifyContent: 'center' as const }}
                            onPress={() => handleRemoveFromSelection(item.name)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${item.name} from selection`}
                            android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                          >
                            <Feather name="x" size={12} color={theme.colors.primaryText} />
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              )}
            </View>)}

            <View style={[styles.inputRow, styles.modalInputRow]}>
              <TextInput
                ref={inputRef}
                placeholder="Type an item..."
                value={overlayInput}
                onChangeText={onChangeInput}
                onSubmitEditing={handleAdd}
                blurOnSubmit={false}
                returnKeyType="send"
                style={styles.input}
                placeholderTextColor={theme.colors.textSecondary}
              />
              <Pressable
                style={styles.addButton}
                onPress={handleAdd}
                accessibilityRole="button"
                accessibilityLabel="Add typed item"
              >
                <Ionicons name="add" size={20} color={theme.colors.primaryText} />
              </Pressable>
            </View>
          </View>

          {!isKeyboardUp && (
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
          )}
        </View>
        {toastText ? (
          <Animated.View
            style={{
              position: 'absolute',
              bottom: 80,
              left: 24,
              right: 24,
              backgroundColor: '#333',
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 18,
              alignItems: 'center' as const,
              opacity: toastOpacity,
            }}
            pointerEvents="none"
          >
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600', textAlign: 'center' }}>{toastText}</Text>
          </Animated.View>
        ) : null}
      </View>

      <SmartSuggestionsModal
        visible={isSuggestModalOpen}
        prompt={suggestPrompt.trim()}
        onClose={() => setIsSuggestModalOpen(false)}
        onAddSelected={(items) => {
          handleAddMultipleSelected(items);
          setIsSuggestModalOpen(false);
          setSuggestPrompt('');
        }}
        onQuickAdd={(items) => {
          handleQuickAddMultiple(items);
          setIsSuggestModalOpen(false);
          setSuggestPrompt('');
        }}
      />

      <SavedSetModal
        visible={isSavedSetModalOpen}
        savedSet={activeSavedSet}
        onClose={() => setIsSavedSetModalOpen(false)}
        onAddSelected={(items) => {
          handleAddMultipleSelected(items);
          setIsSavedSetModalOpen(false);
        }}
        onQuickAdd={(items) => {
          handleQuickAddMultiple(items);
          setIsSavedSetModalOpen(false);
        }}
        onUpdateSet={(setId, items) => {
          onUpdateSavedSet(setId, items);
          setIsSavedSetModalOpen(false);
        }}
      />

      <Modal
        transparent
        visible={isSaveSetPromptOpen}
        animationType="fade"
        onRequestClose={() => setIsSaveSetPromptOpen(false)}
        onShow={() => setTimeout(() => saveSetInputRef.current?.focus(), 100)}
      >
        <View style={styles.modalContainer}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsSaveSetPromptOpen(false)} />
          <View style={[styles.modalPanel, { maxHeight: 220 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Save as set</Text>
              <Pressable onPress={() => setIsSaveSetPromptOpen(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
              </Pressable>
            </View>
            <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}>
              <TextInput
                ref={saveSetInputRef}
                placeholder="Set name..."
                value={saveSetName}
                onChangeText={setSaveSetName}
                onSubmitEditing={() => {
                  const trimmed = saveSetName.trim();
                  if (trimmed && selectedRecent.length > 0) {
                    onCreateSavedSet(trimmed, selectedRecent.map(({ name, quantity }) => ({ name, quantity })));
                    setIsSaveSetPromptOpen(false);
                  }
                }}
                returnKeyType="done"
                style={{
                  fontSize: 16,
                  color: theme.colors.text,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  height: 48,
                  backgroundColor: theme.colors.inputBackground,
                }}
                placeholderTextColor={theme.colors.textSecondary}
              />
              <Pressable
                style={({ pressed }) => ({
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: saveSetName.trim() ? theme.colors.primary : `${theme.colors.primary}40`,
                  alignItems: 'center' as const,
                  opacity: pressed ? 0.7 : 1,
                })}
                disabled={!saveSetName.trim()}
                onPress={() => {
                  const trimmed = saveSetName.trim();
                  if (trimmed && selectedRecent.length > 0) {
                    onCreateSavedSet(trimmed, selectedRecent.map(({ name, quantity }) => ({ name, quantity })));
                    setIsSaveSetPromptOpen(false);
                  }
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.primaryText }}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};
