import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Alert, Pressable, SafeAreaView, Text, View } from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { Fab } from '../components/Fab';
import { Header } from '../components/Header';
import { OverlayModal } from '../components/OverlayModal';
import { ShoppingList } from '../components/ShoppingList';
import { useAppStyles } from '../styles/appStyles';
import { ShoppingItem, SelectedRecentItem } from '../types';

type ShoppingListScreenProps = {
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
  recentItems: string[];
  selectedRecent: SelectedRecentItem[];
  handleOverlayAdd: () => void;
  handleAddSelected: () => void;
  handleToggleRecent: (name: string) => void;
  handleUpdateRecentQuantity: (name: string, delta: number) => void;
  handleClearRecents: () => void;
  handleToggle: (id: string) => void;
  handleDelete: (id: string) => void;
  handleClearAll: () => void;
  handleIncrementQuantity: (id: string) => void;
  handleDecrementQuantity: (id: string) => void;
  onBack: () => void;
};

export const ShoppingListScreen = ({
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
  recentItems,
  selectedRecent,
  handleOverlayAdd,
  handleAddSelected,
  handleToggleRecent,
  handleUpdateRecentQuantity,
  handleClearRecents,
  handleToggle,
  handleDelete,
  handleClearAll,
  handleIncrementQuantity,
  handleDecrementQuantity,
  onBack,
}: ShoppingListScreenProps) => {
  const styles = useAppStyles();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleClearRecentsPress = () => {
    setIsSettingsOpen(false);
    Alert.alert(
      'Clear recents?',
      'This will remove all recent items from this list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: handleClearRecents,
        },
      ]
    );
  };

  const handleClearAllPress = () => {
    setIsSettingsOpen(false);
    handleClearAll();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={listName}
        subtitle="Simple, fast, and focused"
        onBack={onBack}
        onOpenSettings={() => setIsSettingsOpen((current) => !current)}
      />
      {isSettingsOpen ? (
        <>
          <Pressable
            style={styles.settingsPopoverBackdrop}
            onPress={() => setIsSettingsOpen(false)}
          />
          <View style={styles.settingsPopover}>
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

      <Fab onPress={openOverlay} />

      <OverlayModal
        visible={isOverlayOpen}
        overlayInput={overlayInput}
        onChangeInput={setOverlayInput}
        onAddInput={handleOverlayAdd}
        recentItems={recentItems}
        selectedRecent={selectedRecent}
        onToggleRecent={handleToggleRecent}
        onUpdateRecentQuantity={handleUpdateRecentQuantity}
        onAddSelected={handleAddSelected}
        onClose={closeOverlay}
      />

      <StatusBar style="dark" />
    </SafeAreaView>
  );
};
