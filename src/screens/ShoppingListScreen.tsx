import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { useLocale } from '../i18n/LocaleContext';
import { SavedSet, SavedSetItem, ShoppingItem, SelectedRecentItem } from '../types';

type ShoppingListScreenProps = {
  listId: string;
  listName: string;
  listDescription?: string;
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
  listDescription,
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
  const { theme, isDark } = useTheme();
  const { t } = useLocale();
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

  // New set from scratch state
  const [isNewSetPromptOpen, setIsNewSetPromptOpen] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  const newSetInputRef = useRef<TextInput | null>(null);

  const submitNewSet = () => {
    const name = newSetName.trim();
    if (!name) return;
    const draft: SavedSet = {
      id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      items: [],
      createdAt: Date.now(),
    };
    setActiveSavedSet(draft);
    setIsNewSetPromptOpen(false);
    setIsSavedSetsListOpen(false);
    setIsSavedSetModalOpen(true);
  };

  const handleClearRecentsPress = () => {
    setIsSettingsOpen(false);
    setConfirmModal({
      title: t('shoppingList.clearRecentsTitle'),
      message: t('shoppingList.clearRecentsMessage'),
      onConfirm: handleClearRecents,
    });
  };

  const handleClearAllPress = () => {
    setIsSettingsOpen(false);
    setConfirmModal({
      title: t('shoppingList.clearAllTitle'),
      message: t('shoppingList.clearAllMessage'),
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

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={listName}
        subtitle={listDescription}
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
              <Text style={styles.settingsPopoverButtonText}>{t('shoppingList.shareList')}</Text>
            </Pressable>
            <View style={styles.settingsPopoverDivider} />
            <Pressable
              style={styles.settingsPopoverButton}
              onPress={handleClearRecentsPress}
            >
              <Text style={styles.settingsPopoverButtonText}>{t('shoppingList.clearRecents')}</Text>
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
                    {t('shoppingList.clearAllItems')}
                  </Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </>
      ) : null}

      {!hasItems && (
        <EmptyState
          title={t('shoppingList.emptyTitle')}
          subtitle={t('shoppingList.emptySubtitle')}
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
          isCaretOpen={isCaretOpen}
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
              <Text style={styles.modalTitle}>{t('shoppingList.aiSuggestions')}</Text>
              <Pressable onPress={() => setIsSuggestPromptOpen(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
              </Pressable>
            </View>
            <View style={{ paddingHorizontal: 0, paddingBottom: 20, gap: 12 }}>
              <Text style={{ fontSize: 14, fontFamily: theme.fonts.regular, color: theme.colors.textSecondary }}>
                {t('shoppingList.aiPromptHint')}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, height: 44 }}>
                <TextInput
                  ref={suggestInputRef}
                  placeholder={t('shoppingList.aiPromptPlaceholder')}
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
                  accessibilityLabel={t('shoppingList.aiGenerate')}
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
          <View style={[styles.modalPanel, { height: 'auto', maxHeight: '60%', paddingBottom: 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('shoppingList.savedSets')}</Text>
              <Pressable
                onPress={() => { setNewSetName(''); setIsNewSetPromptOpen(true); }}
                style={[styles.modalCloseButton, { marginRight: 8 }]}
                accessibilityRole="button"
                accessibilityLabel={t('shoppingList.createSetLabel')}
              >
                <Ionicons name="add" size={22} color={theme.colors.primary} />
              </Pressable>
              <Pressable onPress={() => setIsSavedSetsListOpen(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
              </Pressable>
            </View>
            {savedSets.length === 0 ? (
              <Text style={[styles.overlayPlaceholderText, { paddingBottom: 16 }]}>
                {t('shoppingList.noSavedSets')}
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
                  accessibilityLabel={t('shoppingList.openSavedSet', { name: set.name })}
                  android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                >
                  <Ionicons name="albums-outline" size={20} color={theme.colors.primary} style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontFamily: theme.fonts.medium, color: theme.colors.text }}>{set.name}</Text>
                    <Text style={{ fontSize: 12, fontFamily: theme.fonts.regular, color: theme.colors.textSecondary }}>{set.items.length} {t('lists.itemCount.other', { count: set.items.length })}</Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      setIsSavedSetsListOpen(false);
                      setConfirmModal({
                        title: t('shoppingList.deleteSetTitle'),
                        message: t('shoppingList.deleteSetMessage', { name: set.name }),
                        onConfirm: () => onDeleteSavedSet(set.id),
                      });
                    }}
                    style={{ padding: 10, minWidth: 44, minHeight: 44, alignItems: 'center' as const, justifyContent: 'center' as const }}
                    accessibilityRole="button"
                    accessibilityLabel={t('shoppingList.deleteSavedSet', { name: set.name })}
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
          if (setId.startsWith('new-') && activeSavedSet) {
            onCreateSavedSet(activeSavedSet.name, items);
          } else {
            onUpdateSavedSet(setId, items);
          }
          setIsSavedSetModalOpen(false);
        }}
      />

      {/* New saved set name prompt */}
      <Modal
        transparent
        visible={isNewSetPromptOpen}
        animationType="fade"
        onRequestClose={() => setIsNewSetPromptOpen(false)}
        onShow={() => setTimeout(() => newSetInputRef.current?.focus(), 100)}
      >
        <View style={styles.modalContainer}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsNewSetPromptOpen(false)} />
          <View style={[styles.modalPanel, { height: 'auto', maxHeight: 220 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('shoppingList.newSavedSet')}</Text>
              <Pressable onPress={() => setIsNewSetPromptOpen(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
              </Pressable>
            </View>
            <View style={{ paddingBottom: 20, gap: 12 }}>
              <TextInput
                ref={newSetInputRef}
                placeholder={t('shoppingList.setNamePlaceholder')}
                value={newSetName}
                onChangeText={setNewSetName}
                onSubmitEditing={submitNewSet}
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
                  backgroundColor: newSetName.trim() ? theme.colors.primary : `${theme.colors.primary}40`,
                  alignItems: 'center' as const,
                  opacity: pressed ? 0.7 : 1,
                })}
                disabled={!newSetName.trim()}
                onPress={submitNewSet}
              >
                <Text style={{ fontSize: 16, fontFamily: theme.fonts.semibold, color: theme.colors.primaryText }}>{t('common.create')}</Text>
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
          <View style={[styles.modalPanel, { height: 'auto', paddingBottom: 20 }]}>
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
                <Text style={{ fontSize: 16, fontFamily: theme.fonts.semibold, color: theme.colors.text }}>{t('common.cancel')}</Text>
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
                <Text style={{ fontSize: 16, fontFamily: theme.fonts.semibold, color: theme.colors.primaryText }}>{t('shoppingList.clearConfirm')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <StatusBar style={isDark ? 'light' : 'dark'} />
    </SafeAreaView>
  );
};
