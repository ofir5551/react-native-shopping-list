import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, BackHandler, SafeAreaView, View } from 'react-native';
import { useShoppingListsApp } from '../hooks/useShoppingListsApp';
import { ListsScreen } from './ListsScreen';
import { ShoppingListScreen } from './ShoppingListScreen';
import { SettingsScreen } from './SettingsScreen';
import { useAppStyles } from '../styles/appStyles';

export const HomeScreen = () => {
  const styles = useAppStyles();
  const {
    isHydrated,
    route,
    lists,
    currentList,
    openList,
    goToLists,
    goToSettings,
    isListNameModalOpen,
    listNameMode,
    listNameInput,
    listNameError,
    setListNameInput,
    openCreateListModal,
    openRenameListModal,
    openJoinListModal,
    openShareListModal,
    closeListNameModal,
    submitListName,
    deleteList,
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
    handleAddMultipleSelected,
    handleQuickAddMultiple,
    handleClearRecents,
    handleToggle,
    handleDelete,
    handleClearAll,
    handleIncrementQuantity,
    handleDecrementQuantity,
  } = useShoppingListsApp();

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (route.name === 'list') {
          goToLists();
          return true;
        }
        return false;
      }
    );

    return () => subscription.remove();
  }, [route.name, goToLists]);

  if (!isHydrated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#1f7a5a" />
        </View>
        <StatusBar style="dark" />
      </SafeAreaView>
    );
  }

  if (route.name === 'settings') {
    return <SettingsScreen onBack={goToLists} />;
  }

  if (route.name === 'lists' || !currentList) {
    return (
      <ListsScreen
        lists={lists}
        onOpenList={openList}
        onOpenCreateListModal={openCreateListModal}
        onOpenRenameListModal={openRenameListModal}
        onOpenJoinListModal={openJoinListModal}
        onDeleteList={deleteList}
        isListNameModalOpen={isListNameModalOpen}
        listNameMode={listNameMode}
        listNameInput={listNameInput}
        listNameError={listNameError}
        onChangeListName={setListNameInput}
        onCloseListNameModal={closeListNameModal}
        onSubmitListName={submitListName}
        onOpenSettings={goToSettings}
      />
    );
  }

  return (
    <>
      <ShoppingListScreen
        listId={currentList.id}
        listName={currentList.name}
        hasItems={hasItems}
        activeItems={activeItems}
        completedItems={completedItems}
        showCompleted={showCompleted}
        setShowCompleted={setShowCompleted}
        isOverlayOpen={isOverlayOpen}
        openOverlay={openOverlay}
        closeOverlay={closeOverlay}
        overlayInput={overlayInput}
        setOverlayInput={setOverlayInput}
        recentItems={recentItems}
        selectedRecent={selectedRecent}
        handleOverlayAdd={handleOverlayAdd}
        handleAddSelected={handleAddSelected}
        handleToggleRecent={handleToggleRecent}
        handleUpdateRecentQuantity={handleUpdateRecentQuantity}
        handleAddMultipleSelected={handleAddMultipleSelected}
        handleQuickAddMultiple={handleQuickAddMultiple}
        handleClearRecents={handleClearRecents}
        handleToggle={handleToggle}
        handleDelete={handleDelete}
        handleClearAll={handleClearAll}
        handleIncrementQuantity={handleIncrementQuantity}
        handleDecrementQuantity={handleDecrementQuantity}
        onBack={goToLists}
        onShareList={() => openShareListModal(currentList.id)}
      />
      {/* We need to render the Modal here so it can overlay ShoppingListScreen too */}
      <ListsScreen
        lists={lists}
        onOpenList={openList}
        onOpenCreateListModal={openCreateListModal}
        onOpenRenameListModal={openRenameListModal}
        onOpenJoinListModal={openJoinListModal}
        onDeleteList={deleteList}
        isListNameModalOpen={isListNameModalOpen}
        listNameMode={listNameMode}
        listNameInput={listNameInput}
        listNameError={listNameError}
        onChangeListName={setListNameInput}
        onCloseListNameModal={closeListNameModal}
        onSubmitListName={submitListName}
        onOpenSettings={goToSettings}
        hidden={true}
      />
    </>
  );
};

export default HomeScreen;
