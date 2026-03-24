import { StatusBar } from 'expo-status-bar';
import React, { memo, useCallback } from 'react';
import { Alert, FlatList, ListRenderItemInfo, Pressable, SafeAreaView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Fab } from '../components/Fab';
import { ListNameModal } from '../components/ListNameModal';
import { Header } from '../components/Header';
import { useAppStyles } from '../styles/appStyles';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../i18n/LocaleContext';
import { pluralItemCount } from '../i18n/index';
import { ShoppingList } from '../types';

type ListsScreenProps = {
  lists: ShoppingList[];
  currentUserId?: string;
  onOpenList: (listId: string) => void;
  onOpenCreateListModal: () => void;
  onOpenRenameListModal: (listId: string) => void;
  onOpenJoinListModal: () => void;
  onDeleteList: (listId: string) => void;
  onLeaveList: (listId: string) => void;
  isListNameModalOpen: boolean;
  listNameMode: 'create' | 'rename' | 'join' | 'share';
  listNameInput: string;
  listDescriptionInput: string;
  listNameError: string;
  onChangeListName: (value: string) => void;
  onChangeListDescription: (value: string) => void;
  onCloseListNameModal: () => void;
  onSubmitListName: () => void;
  onOpenSettings: () => void;
  hidden?: boolean;
};

const keyExtractor = (item: ShoppingList) => item.id;

type ListCardProps = {
  item: ShoppingList;
  currentUserId?: string;
  onOpenList: (listId: string) => void;
  onOpenRenameListModal: (listId: string) => void;
  onDeleteList: (listId: string) => void;
  onLeaveList: (listId: string) => void;
};

const ListCard = memo(function ListCard({ item, currentUserId, onOpenList, onOpenRenameListModal, onDeleteList, onLeaveList }: ListCardProps) {
  const styles = useAppStyles();
  const { theme } = useTheme();
  const { t } = useLocale();
  const completedCount = item.items.filter((entry) => entry.purchased).length;
  const isOwner = !currentUserId || !item.ownerId || item.ownerId === currentUserId;
  const isShared = !!currentUserId && !!item.ownerId && item.ownerId !== currentUserId;

  const handleOpen = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onOpenList(item.id);
  }, [item.id, onOpenList]);
  const handleRename = useCallback(() => onOpenRenameListModal(item.id), [item.id, onOpenRenameListModal]);
  const handleDelete = useCallback(() => {
    const message = item.shareCode
      ? t('lists.deleteSharedMessage', { name: item.name })
      : t('lists.deleteMessage', { name: item.name });
    Alert.alert(t('lists.deleteTitle'), message, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => onDeleteList(item.id) },
    ]);
  }, [item.id, item.name, item.shareCode, onDeleteList, t]);
  const handleLeave = useCallback(() => {
    Alert.alert(t('lists.exitTitle'), t('lists.exitMessage', { name: item.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('lists.exitButton'), style: 'destructive', onPress: () => onLeaveList(item.id) },
    ]);
  }, [item.id, item.name, onLeaveList, t]);

  return (
    <View style={styles.listCard}>
      <View style={styles.listCardRow}>
        <Pressable
          style={styles.listCardMain}
          onPress={handleOpen}
        >
          <View style={styles.listCardTitleRow}>
            <Text style={styles.listCardTitle}>{item.name}</Text>
            {isShared && (
              <Ionicons
                name="people-outline"
                size={16}
                color={theme.colors.textSecondary}
                style={styles.listCardSharedIcon}
              />
            )}
          </View>
          <Text style={styles.listCardMeta}>
            {pluralItemCount(t, item.items.length)} • {completedCount} {t('lists.completed')}
          </Text>
        </Pressable>
        <View style={styles.listCardActions}>
          {isOwner && (
            <Pressable
              style={styles.listCardActionButton}
              onPress={handleRename}
              accessibilityRole="button"
              accessibilityLabel={t('lists.renameLabel', { name: item.name })}
            >
              <Ionicons name="create-outline" size={18} color={theme.colors.textSecondary} />
            </Pressable>
          )}
          {isOwner ? (
            <Pressable
              style={styles.listCardActionButton}
              onPress={handleDelete}
              accessibilityRole="button"
              accessibilityLabel={t('lists.deleteLabel', { name: item.name })}
            >
              <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
            </Pressable>
          ) : (
            <Pressable
              style={styles.listCardActionButton}
              onPress={handleLeave}
              accessibilityRole="button"
              accessibilityLabel={t('lists.exitLabel', { name: item.name })}
            >
              <Ionicons name="exit-outline" size={18} color={theme.colors.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
});

export const ListsScreen = ({
  lists,
  currentUserId,
  onOpenList,
  onOpenCreateListModal,
  onOpenRenameListModal,
  onOpenJoinListModal,
  onDeleteList,
  onLeaveList,
  isListNameModalOpen,
  listNameMode,
  listNameInput,
  listDescriptionInput,
  listNameError,
  onChangeListName,
  onChangeListDescription,
  onCloseListNameModal,
  onSubmitListName,
  onOpenSettings,
  hidden,
}: ListsScreenProps) => {
  const styles = useAppStyles();
  const { theme, isDark } = useTheme();
  const { t } = useLocale();

  const renderItem = useCallback(({ item }: ListRenderItemInfo<ShoppingList>) => (
    <ListCard
      item={item}
      currentUserId={currentUserId}
      onOpenList={onOpenList}
      onOpenRenameListModal={onOpenRenameListModal}
      onDeleteList={onDeleteList}
      onLeaveList={onLeaveList}
    />
  ), [currentUserId, onOpenList, onOpenRenameListModal, onDeleteList, onLeaveList]);

  if (hidden) return (
    <ListNameModal
      visible={isListNameModalOpen}
      mode={listNameMode}
      value={listNameInput}
      description={listDescriptionInput}
      error={listNameError}
      onChange={onChangeListName}
      onDescriptionChange={onChangeListDescription}
      onSubmit={onSubmitListName}
      onClose={onCloseListNameModal}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={t('lists.title')}
        subtitle={t('lists.subtitle')}
        onOpenSettings={onOpenSettings}
      >
        {currentUserId && (
          <Pressable
            style={styles.iconButton}
            onPress={onOpenJoinListModal}
            accessibilityRole="button"
            accessibilityLabel={t('lists.joinShared')}
          >
            <Ionicons name="link-outline" size={20} color={theme.colors.textSecondary} />
          </Pressable>
        )}
      </Header>

      {lists.length === 0 ? (
        <View style={styles.listsEmptyState}>
          <Text style={styles.emptyTitle}>{t('lists.emptyTitle')}</Text>
          <Text style={styles.emptySubtitle}>{t('lists.emptySubtitle')}</Text>
        </View>
      ) : (
        <FlatList
          data={lists}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
        />
      )}

      <Fab mode="add" onPress={onOpenCreateListModal} />

      <ListNameModal
        visible={isListNameModalOpen}
        mode={listNameMode}
        value={listNameInput}
        description={listDescriptionInput}
        error={listNameError}
        onChange={onChangeListName}
        onDescriptionChange={onChangeListDescription}
        onSubmit={onSubmitListName}
        onClose={onCloseListNameModal}
      />

      <StatusBar style={isDark ? 'light' : 'dark'} />
    </SafeAreaView>
  );
};
