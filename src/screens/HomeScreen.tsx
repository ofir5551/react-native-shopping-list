import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, BackHandler, SafeAreaView, View } from 'react-native';
import { useShoppingListsApp } from '../hooks/useShoppingListsApp';
import { ListsScreen } from './ListsScreen';
import { LoginScreen } from './LoginScreen';
import { ShoppingListScreen } from './ShoppingListScreen';
import { SignUpScreen } from './SignUpScreen';
import { SettingsScreen } from './SettingsScreen';
import { useAppStyles } from '../styles/appStyles';
import { useTheme } from '../context/ThemeContext';

export const HomeScreen = () => {
  const styles = useAppStyles();
  const { theme, isDark } = useTheme();
  const {
    isHydrated,
    route,
    lists,
    currentList,
    openList,
    goToLists,
    goToSettings,
    goToLogin,
    goToSignup,
    isListNameModalOpen,
    listNameMode,
    listNameInput,
    listDescriptionInput,
    listNameError,
    setListNameInput,
    setListDescriptionInput,
    openCreateListModal,
    openRenameListModal,
    openJoinListModal,
    openShareListModal,
    closeListNameModal,
    submitListName,
    deleteList,
    leaveList,
    currentUserId,
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
    createSavedSet,
    updateSavedSet,
    deleteSavedSet,
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
          if (isOverlayOpen) return false;
          goToLists();
          return true;
        }
        if (route.name === 'settings') {
          goToLists();
          return true;
        }
        return false;
      }
    );

    return () => subscription.remove();
  }, [route.name, isOverlayOpen, goToLists]);

  if (!isHydrated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </SafeAreaView>
    );
  }

  if (route.name === 'login') {
    return <LoginScreen onBack={goToSettings} onGoToSignup={goToSignup} onLoginSuccess={goToLists} />;
  }

  if (route.name === 'signup') {
    return <SignUpScreen onBack={goToSettings} onGoToLogin={goToLogin} onSignUpSuccess={goToSettings} onLoginSuccess={goToLists} />;
  }

  if (route.name === 'settings') {
    return <SettingsScreen onBack={goToLists} onSignIn={goToLogin} />;
  }

  if (route.name === 'lists' || !currentList) {
    return (
      <ListsScreen
        lists={lists}
        currentUserId={currentUserId}
        onOpenList={openList}
        onOpenCreateListModal={openCreateListModal}
        onOpenRenameListModal={openRenameListModal}
        onOpenJoinListModal={openJoinListModal}
        onDeleteList={deleteList}
        onLeaveList={leaveList}
        isListNameModalOpen={isListNameModalOpen}
        listNameMode={listNameMode}
        listNameInput={listNameInput}
        listDescriptionInput={listDescriptionInput}
        listNameError={listNameError}
        onChangeListName={setListNameInput}
        onChangeListDescription={setListDescriptionInput}
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
        listDescription={currentList.description}
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
        suggestions={suggestions}
        selectedRecent={selectedRecent}
        hasOverlayChanges={hasOverlayChanges}
        handleOverlayAdd={handleOverlayAdd}
        handleAddSelected={handleAddSelected}
        handleToggleRecent={handleToggleRecent}
        handleUpdateRecentQuantity={handleUpdateRecentQuantity}
        handleDismissSuggestion={handleDismissSuggestion}
        handleQuickAddMultiple={handleQuickAddMultiple}
        handleClearRecents={handleClearRecents}
        savedSets={savedSets}
        onCreateSavedSet={createSavedSet}
        onUpdateSavedSet={updateSavedSet}
        onDeleteSavedSet={deleteSavedSet}
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
        currentUserId={currentUserId}
        onOpenList={openList}
        onOpenCreateListModal={openCreateListModal}
        onOpenRenameListModal={openRenameListModal}
        onOpenJoinListModal={openJoinListModal}
        onDeleteList={deleteList}
        onLeaveList={leaveList}
        isListNameModalOpen={isListNameModalOpen}
        listNameMode={listNameMode}
        listNameInput={listNameInput}
        listDescriptionInput={listDescriptionInput}
        listNameError={listNameError}
        onChangeListName={setListNameInput}
        onChangeListDescription={setListDescriptionInput}
        onCloseListNameModal={closeListNameModal}
        onSubmitListName={submitListName}
        onOpenSettings={goToSettings}
        hidden={true}
      />
    </>
  );
};

export default HomeScreen;
