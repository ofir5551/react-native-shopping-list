import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, BackHandler, SafeAreaView, View } from 'react-native';
import { useShoppingListsApp } from '../hooks/useShoppingListsApp';
import { ListsScreen } from './ListsScreen';
import { ShoppingListScreen } from './ShoppingListScreen';
import { styles } from '../styles/appStyles';

export const HomeScreen = () => {
  const {
    isHydrated,
    route,
    lists,
    currentList,
    openList,
    goToLists,
    isListNameModalOpen,
    listNameMode,
    listNameInput,
    listNameError,
    setListNameInput,
    openCreateListModal,
    openRenameListModal,
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
    handleToggle,
    handleDelete,
    handleClearAll,
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

  if (route.name === 'lists' || !currentList) {
    return (
      <ListsScreen
        lists={lists}
        onOpenList={openList}
        onOpenCreateListModal={openCreateListModal}
        onOpenRenameListModal={openRenameListModal}
        onDeleteList={deleteList}
        isListNameModalOpen={isListNameModalOpen}
        listNameMode={listNameMode}
        listNameInput={listNameInput}
        listNameError={listNameError}
        onChangeListName={setListNameInput}
        onCloseListNameModal={closeListNameModal}
        onSubmitListName={submitListName}
      />
    );
  }

  return (
    <ShoppingListScreen
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
      handleToggle={handleToggle}
      handleDelete={handleDelete}
      handleClearAll={handleClearAll}
      onBack={goToLists}
    />
  );
};

export default HomeScreen;
