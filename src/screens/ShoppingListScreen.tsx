import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../components/EmptyState';
import { Fab } from '../components/Fab';
import { CaretPopover } from '../components/CaretPopover';
import { Header } from '../components/Header';
import { OverlayModal } from '../components/OverlayModal';
import { ShoppingList } from '../components/ShoppingList';
import { SmartSuggestionsModal } from '../components/SmartSuggestionsModal';
import { SavedSetModal } from '../components/SavedSetModal';
import { useAppStyles } from '../styles/appStyles';
import { useTheme } from '../context/ThemeContext';
import { SavedSet, SavedSetItem, ShoppingItem, SelectedRecentItem } from '../types';

type ShoppingListScreenProps = {
  listId: string;
  listName: string;
  hasItems: boolean;
  activeItems: ShoppingItem[];
  completedItems: ShoppingItem[];
  showCompleted: boolean;
  setShowCompleted: (value: boolean) => void;
  isOverlayOpen: boolean;
  openOverlay: () => void;
  closeOverlay: () => void;
  overlayInput: string;
  setOverlayInput: (value: string) => void;
  suggestions: string[];
  selectedRecent: SelectedRecentItem[];
  hasOverlayChanges: boolean;
  handleOverlayAdd: () => void;
  handleAddSelected: () => void;
  handleToggleRecent: (name: string) => void;
  handleUpdateRecentQuantity: (name: string, delta: number) => void;
  handleDismissSuggestion: (name: string) => void;
  handleAddMultipleSelected: (items: { name: string; quantity: number }[]) => void;
  handleQuickAddMultiple: (items: { name: string; quantity: number }[]) => void;
  handleClearRecents: () => void;
  savedSets: SavedSet[];
  onCreateSavedSet: (name: string, items: SavedSetItem[]) => void;
  onUpdateSavedSet: (setId: string, items: SavedSetItem[]) => void;
  onDeleteSavedSet: (setId: string) => void;
  handleToggle: (id: string) => void;
  handleDelete: (id: string) => void;
  handleClearAll: () => void;
  handleIncrementQuantity: (id: string) => void;
  handleDecrementQuantity: (id: string) => void;
  onBack: () => void;
  onShareList: () => void;
};

export const ShoppingListScreen = ({
  listId,
  listName,
  hasItems,
  activeItems,
  completedItems,
  showCompleted,
  setShowCompleted,
  isOverlayOpen,
  openOverlay,
  closeOverlay,
  overlayInput,
  setOverlayInput,
  suggestions,
  selectedRecent,
  hasOverlayChanges,
  handleOverlayAdd,
  handleAddSelected,
  handleToggleRecent,
  handleUpdateRecentQuantity,
  handleDismissSuggestion,
  handleAddMultipleSelected,
  handleQuickAddMultiple,
  handleClearRecents,
  savedSets,
  onCreateSavedSet,
  onUpdateSavedSet,
  onDeleteSavedSet,
  handleToggle,
  handleDelete,
  handleClearAll,
  handleIncrementQuantity,
  handleDecrementQuantity,
  onBack,
  onShareList,
}: ShoppingListScreenProps) => {
  const styles = useAppStyles();
  const { theme } = useTheme();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCaretOpen, setIsCaretOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // AI Suggestions state
  const [suggestPrompt, setSuggestPrompt] = useState('');
  const [isSuggestPromptOpen, setIsSuggestPromptOpen] = useState(false);
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);
  const suggestInputRef = useRef<TextInput | null>(null);

  // Saved Sets state
  const [isSavedSetsListOpen, setIsSavedSetsListOpen] = useState(false);
  const [activeSavedSet, setActiveSavedSet] = useState<SavedSet | null>(null);
  const [isSavedSetModalOpen, setIsSavedSetModalOpen] = useState(false);

  // Confirm dialog state
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  // Save as set state
  const [isSaveSetPromptOpen, setIsSaveSetPromptOpen] = useState(false);
  const [saveSetName, setSaveSetName] = useState('');
  const saveSetInputRef = useRef<TextInput | null>(null);

  const submitSaveAsSet = () => {
    const trimmed = saveSetName.trim();
    if (trimmed && selectedRecent.length > 0) {
      onCreateSavedSet(trimmed, selectedRecent.map(({ name, quantity }) => ({ name, quantity })));
      setIsSaveSetPromptOpen(false);
    }
  };

  const handleClearRecentsPress = () => {
    setIsSettingsOpen(false);
    setConfirmModal({
      title: 'Clear recents?',
      message: 'This will remove all recent items from this list.',
      onConfirm: handleClearRecents,
    });
  };

  const handleClearAllPress = () => {
    setIsSettingsOpen(false);
    setConfirmModal({
      title: 'Clear all items?',
      message: 'This will permanently remove all items from this list.',
      onConfirm: handleClearAll,
    });
  };

  const handleFabPress = () => {
    if (isOverlayOpen) {
      handleAddSelected();
    } else {
      openOverlay();
    }
  };

  const handleOpenAiSuggestions = () => {
    setSuggestPrompt('');
    setIsSuggestPromptOpen(true);
  };

  const handleSubmitSuggestPrompt = () => {
    if (suggestPrompt.trim()) {
      Keyboard.dismiss();
      setIsSuggestPromptOpen(false);
      setIsSuggestModalOpen(true);
    }
  };

  const handleOpenSavedSetsList = () => {
    setIsSavedSetsListOpen(true);
  };

  const handleOpenSaveAsSet = () => {
    setSaveSetName('');
    setIsSaveSetPromptOpen(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={listName}
        subtitle="Simple, fast, and focused"
        onBack={onBack}
        onOpenSettings={() => setIsSettingsOpen((current) => !current)}
        settingsIcon="options"
      />

      {/* Settings popover */}
      {isSettingsOpen ? (
        <>
          <Pressable
            style={styles.settingsPopoverBackdrop}
            onPress={() => setIsSettingsOpen(false)}
          />
          <View style={styles.settingsPopover}>
            <Pressable
              style={styles.settingsPopoverButton}
              onPress={() => { setIsSettingsOpen(false); onShareList(); }}
            >
              <Text style={styles.settingsPopoverButtonText}>Share list</Text>
            </Pressable>
            <View style={styles.settingsPopoverDivider} />
            <Pressable
              style={styles.settingsPopoverButton}
              onPress={handleClearRecentsPress}
            >
              <Text style={styles.settingsPopoverButtonText}>Clear recents</Text>
            </Pressable>
            {hasItems ? (
              <>
                <View style={styles.settingsPopoverDivider} />
                <Pressable
                  style={styles.settingsPopoverButton}
                  onPress={handleClearAllPress}
                >
                  <Text
                    style={[
                      styles.settingsPopoverButtonText,
                      styles.settingsPopoverDangerText,
                    ]}
                  >
                    Clear all items
                  </Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </>
      ) : null}

      {!hasItems && (
        <EmptyState
          title="Your list is empty"
          subtitle="Add your first item to get started."
        />
      )}

      {hasItems && (
        <ShoppingList
          activeItems={activeItems}
          completedItems={completedItems}
          showCompleted={showCompleted}
          onToggleCompleted={() => setShowCompleted(!showCompleted)}
          onToggleItem={handleToggle}
          onDeleteItem={handleDelete}
          onIncrementItem={handleIncrementQuantity}
          onDecrementItem={handleDecrementQuantity}
        />
      )}

      {/* Overlay (absolute-positioned, renders below FAB in z-order) */}
      <OverlayModal
        visible={isOverlayOpen}
        overlayInput={overlayInput}
        onChangeInput={setOverlayInput}
        onAddInput={handleOverlayAdd}
        suggestions={suggestions}
        selectedRecent={selectedRecent}
        onToggleRecent={handleToggleRecent}
        onUpdateRecentQuantity={handleUpdateRecentQuantity}
        onDismissSuggestion={handleDismissSuggestion}
        onClose={closeOverlay}
        onSaveAsSet={handleOpenSaveAsSet}
      />

      {/* Caret popover */}
      {isCaretOpen && (
        <CaretPopover
          onAiSuggestions={handleOpenAiSuggestions}
          onSavedSets={handleOpenSavedSetsList}
          onClose={() => setIsCaretOpen(false)}
        />
      )}

      {/* FAB (rendered after overlay so it appears on top) */}
      {(!isOverlayOpen || hasOverlayChanges) && (
        <Fab
          mode={isOverlayOpen ? 'confirm' : 'add'}
          onPress={handleFabPress}
          onCaretPress={() => setIsCaretOpen((c) => !c)}
          style={isOverlayOpen && keyboardHeight > 0 ? { bottom: 28 + keyboardHeight } : undefined}
        />
      )}

      {/* AI Suggest prompt modal */}
      <Modal
        transparent
        visible={isSuggestPromptOpen}
        animationType="fade"
        onRequestClose={() => setIsSuggestPromptOpen(false)}
        onShow={() => setTimeout(() => suggestInputRef.current?.focus(), 100)}
      >
        <View style={styles.modalContainer}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsSuggestPromptOpen(false)} />
          <View style={[styles.modalPanel, { height: 'auto', maxHeight: 260 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>AI Suggestions</Text>
              <Pressable onPress={() => setIsSuggestPromptOpen(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
              </Pressable>
            </View>
            <View style={{ paddingHorizontal: 0, paddingBottom: 16, gap: 12 }}>
              <Text style={{ fontSize: 14, fontFamily: theme.fonts.regular, color: theme.colors.textSecondary }}>
                Type a prompt (e.g., "birthday party for 10 kids") to generate suggested items.
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, height: 44 }}>
                <TextInput
                  ref={suggestInputRef}
                  placeholder="Enter prompt..."
                  value={suggestPrompt}
                  onChangeText={setSuggestPrompt}
                  onSubmitEditing={handleSubmitSuggestPrompt}
                  blurOnSubmit={false}
                  returnKeyType="go"
                  style={[styles.input, { flex: 1, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 14, backgroundColor: theme.colors.inputBackground }]}
                  placeholderTextColor={theme.colors.textSecondary}
                />
                <Pressable
                  style={[styles.addButton, { backgroundColor: suggestPrompt.trim() ? theme.colors.primary : theme.colors.border }]}
                  onPress={handleSubmitSuggestPrompt}
                  disabled={!suggestPrompt.trim()}
                  accessibilityRole="button"
                  accessibilityLabel="Generate suggestions"
                >
                  <Ionicons name="sparkles" size={20} color={theme.colors.primaryText} />
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Smart Suggestions results modal */}
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

      {/* Saved sets list modal */}
      <Modal
        transparent
        visible={isSavedSetsListOpen}
        animationType="slide"
        onRequestClose={() => setIsSavedSetsListOpen(false)}
      >
        <View style={styles.modalContainer}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsSavedSetsListOpen(false)} />
          <View style={[styles.modalPanel, { height: 'auto', maxHeight: '60%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Saved Sets</Text>
              <Pressable onPress={() => setIsSavedSetsListOpen(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
              </Pressable>
            </View>
            {savedSets.length === 0 ? (
              <Text style={[styles.overlayPlaceholderText, { paddingBottom: 16 }]}>
                No saved sets yet. Select items and tap "Save as set" to create one.
              </Text>
            ) : (
              savedSets.map((set) => (
                <Pressable
                  key={set.id}
                  onPress={() => {
                    setActiveSavedSet(set);
                    setIsSavedSetsListOpen(false);
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
                    <Text style={{ fontSize: 15, fontFamily: theme.fonts.medium, color: theme.colors.text }}>{set.name}</Text>
                    <Text style={{ fontSize: 12, fontFamily: theme.fonts.regular, color: theme.colors.textSecondary }}>{set.items.length} items</Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      setIsSavedSetsListOpen(false);
                      setConfirmModal({
                        title: 'Delete set?',
                        message: `Remove "${set.name}"? This cannot be undone.`,
                        onConfirm: () => onDeleteSavedSet(set.id),
                      });
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
          </View>
        </View>
      </Modal>

      {/* Saved set detail modal */}
      <SavedSetModal
        visible={isSavedSetModalOpen}
        savedSet={activeSavedSet}
        onClose={() => setIsSavedSetModalOpen(false)}
        onAddAllToList={(items) => {
          handleQuickAddMultiple(items);
          setIsSavedSetModalOpen(false);
        }}
        onUpdateSet={(setId, items) => {
          onUpdateSavedSet(setId, items);
          setIsSavedSetModalOpen(false);
        }}
      />

      {/* Save as set name prompt */}
      <Modal
        transparent
        visible={isSaveSetPromptOpen}
        animationType="fade"
        onRequestClose={() => setIsSaveSetPromptOpen(false)}
        onShow={() => setTimeout(() => saveSetInputRef.current?.focus(), 100)}
      >
        <View style={styles.modalContainer}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsSaveSetPromptOpen(false)} />
          <View style={[styles.modalPanel, { height: 'auto', maxHeight: 220 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Save as set</Text>
              <Pressable onPress={() => setIsSaveSetPromptOpen(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
              </Pressable>
            </View>
            <View style={{ paddingBottom: 16, gap: 12 }}>
              <TextInput
                ref={saveSetInputRef}
                placeholder="Set name..."
                value={saveSetName}
                onChangeText={setSaveSetName}
                onSubmitEditing={submitSaveAsSet}
                returnKeyType="done"
                style={{
                  fontSize: 16,
                  fontFamily: theme.fonts.regular,
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
                onPress={submitSaveAsSet}
              >
                <Text style={{ fontSize: 16, fontFamily: theme.fonts.semibold, color: theme.colors.primaryText }}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirm dialog */}
      <Modal
        transparent
        visible={!!confirmModal}
        animationType="fade"
        onRequestClose={() => setConfirmModal(null)}
      >
        <View style={styles.modalContainer}>
          <Pressable style={styles.modalBackdrop} onPress={() => setConfirmModal(null)} />
          <View style={[styles.modalPanel, { height: 'auto' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{confirmModal?.title}</Text>
            </View>
            <Text style={{ fontSize: 14, fontFamily: theme.fonts.regular, color: theme.colors.textSecondary, paddingBottom: 16 }}>
              {confirmModal?.message}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                style={({ pressed }) => ({
                  flex: 1, padding: 14, borderRadius: 12,
                  backgroundColor: theme.colors.surfaceHighlight,
                  alignItems: 'center' as const,
                  opacity: pressed ? 0.7 : 1,
                })}
                onPress={() => setConfirmModal(null)}
              >
                <Text style={{ fontSize: 16, fontFamily: theme.fonts.semibold, color: theme.colors.text }}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => ({
                  flex: 1, padding: 14, borderRadius: 12,
                  backgroundColor: theme.colors.danger,
                  alignItems: 'center' as const,
                  opacity: pressed ? 0.7 : 1,
                })}
                onPress={() => {
                  confirmModal?.onConfirm();
                  setConfirmModal(null);
                }}
              >
                <Text style={{ fontSize: 16, fontFamily: theme.fonts.semibold, color: theme.colors.primaryText }}>Clear</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <StatusBar style="dark" />
    </SafeAreaView>
  );
};
