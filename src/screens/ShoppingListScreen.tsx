import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaView } from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { Fab } from '../components/Fab';
import { Header } from '../components/Header';
import { OverlayModal } from '../components/OverlayModal';
import { ShoppingList } from '../components/ShoppingList';
import { ShoppingItem } from '../types';
import { styles } from '../styles/appStyles';

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
  selectedRecent: string[];
  handleOverlayAdd: () => void;
  handleAddSelected: () => void;
  handleToggleRecent: (name: string) => void;
  handleToggle: (id: string) => void;
  handleDelete: (id: string) => void;
  handleClearAll: () => void;
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
  handleToggle,
  handleDelete,
  handleClearAll,
  onBack,
}: ShoppingListScreenProps) => (
  <SafeAreaView style={styles.container}>
    <Header
      title={listName}
      subtitle="Simple, fast, and focused"
      onBack={onBack}
      onClearAll={hasItems ? handleClearAll : undefined}
    />

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
      onAddSelected={handleAddSelected}
      onClose={closeOverlay}
    />

    <StatusBar style="dark" />
  </SafeAreaView>
);
