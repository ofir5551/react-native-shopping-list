import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaView } from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { Fab } from '../components/Fab';
import { Header } from '../components/Header';
import { OverlayModal } from '../components/OverlayModal';
import { ShoppingList } from '../components/ShoppingList';
import { useShoppingList } from '../hooks/useShoppingList';
import { styles } from '../styles/appStyles';

export const HomeScreen = () => {
  const {
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
  } = useShoppingList();

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Shopping List"
        subtitle="Simple, fast, and focused"
        onClearAll={handleClearAll}
      />

      {!hasItems && <EmptyState />}

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

      <StatusBar style="auto" />
    </SafeAreaView>
  );
};

export default HomeScreen;
