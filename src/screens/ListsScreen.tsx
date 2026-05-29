import { StatusBar } from 'expo-status-bar';
import React, { memo, useCallback, useState } from 'react';
import { FlatList, ListRenderItemInfo, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
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
  onOpenArchive: () => void;
  hidden?: boolean;
};

const keyExtractor = (item: ShoppingList) => item.id;

const listsEmptyStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  icon: {
    marginBottom: 28,
  },
  title: {
    fontSize: 22,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
});

type ListCardProps = {
  item: ShoppingList;
  currentUserId?: string;
  onOpenList: (listId: string) => void;
  onOpenRenameListModal: (listId: string) => void;
  onRequestDeleteList: (listId: string, message: string) => void;
  onRequestLeaveList: (listId: string, message: string) => void;
};

const ListCard = memo(function ListCard({ item, currentUserId, onOpenList, onOpenRenameListModal, onRequestDeleteList, onRequestLeaveList }: ListCardProps) {
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
    onRequestDeleteList(item.id, message);
  }, [item.id, item.name, item.shareCode, onRequestDeleteList, t]);
  const handleLeave = useCallback(() => {
    onRequestLeaveList(item.id, t('lists.exitMessage', { name: item.name }));
  }, [item.id, item.name, onRequestLeaveList, t]);

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
  onOpenArchive,
  hidden,
}: ListsScreenProps) => {
  const styles = useAppStyles();
  const { theme, isDark } = useTheme();
  const { t } = useLocale();
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const handleRequestDeleteList = useCallback((listId: string, message: string) => {
    setConfirmModal({ title: t('lists.deleteTitle'), message, onConfirm: () => onDeleteList(listId) });
  }, [onDeleteList, t]);

  const handleRequestLeaveList = useCallback((listId: string, message: string) => {
    setConfirmModal({ title: t('lists.exitTitle'), message, onConfirm: () => onLeaveList(listId) });
  }, [onLeaveList, t]);

  const renderItem = useCallback(({ item }: ListRenderItemInfo<ShoppingList>) => (
    <ListCard
      item={item}
      currentUserId={currentUserId}
      onOpenList={onOpenList}
      onOpenRenameListModal={onOpenRenameListModal}
      onRequestDeleteList={handleRequestDeleteList}
      onRequestLeaveList={handleRequestLeaveList}
    />
  ), [currentUserId, onOpenList, onOpenRenameListModal, handleRequestDeleteList, handleRequestLeaveList]);

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
        <Pressable
          style={styles.iconButton}
          onPress={onOpenArchive}
          accessibilityRole="button"
          accessibilityLabel={t('lists.archiveTitle')}
        >
          <Ionicons name="archive-outline" size={20} color={theme.colors.textSecondary} />
        </Pressable>
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
        <View style={listsEmptyStyles.container}>
          <Svg width={72} height={72} viewBox="0 0 24 24" fill="none" style={listsEmptyStyles.icon}>
            <Path
              d="M11 6L21 6.00072M11 12L21 12.0007M11 18L21 18.0007M3 11.9444L4.53846 13.5L8 10M3 5.94444L4.53846 7.5L8 4M4.5 18H4.51M5 18C5 18.2761 4.77614 18.5 4.5 18.5C4.22386 18.5 4 18.2761 4 18C4 17.7239 4.22386 17.5 4.5 17.5C4.77614 17.5 5 17.7239 5 18Z"
              stroke={theme.colors.primary}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={[listsEmptyStyles.title, { color: theme.colors.text, fontFamily: theme.fonts.semibold }]}>
            {t('lists.emptyTitle')}
          </Text>
          <Text style={[listsEmptyStyles.subtitle, { color: theme.colors.textSecondary, fontFamily: theme.fonts.regular }]}>
            {t('lists.emptySubtitle')}
          </Text>
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
                <Text style={{ fontSize: 16, fontFamily: theme.fonts.semibold, color: theme.colors.primaryText }}>{t('common.delete')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <StatusBar style={isDark ? 'light' : 'dark'} />
    </SafeAreaView>
  );
};
