import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Alert, FlatList, Pressable, SafeAreaView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fab } from '../components/Fab';
import { ListNameModal } from '../components/ListNameModal';
import { Header } from '../components/Header';
import { useAppStyles } from '../styles/appStyles';
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
  listNameError: string;
  onChangeListName: (value: string) => void;
  onCloseListNameModal: () => void;
  onSubmitListName: () => void;
  onOpenSettings: () => void;
  hidden?: boolean;
};

const getItemsLabel = (count: number) => (count === 1 ? '1 item' : `${count} items`);

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
  listNameError,
  onChangeListName,
  onCloseListNameModal,
  onSubmitListName,
  onOpenSettings,
  hidden,
}: ListsScreenProps) => {
  const styles = useAppStyles();

  const handleDeleteList = (listId: string, name: string) => {
    Alert.alert('Delete list?', `Delete "${name}" permanently? This will remove the list for all shared users.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => onDeleteList(listId),
      },
    ]);
  };

  const handleLeaveList = (listId: string, name: string) => {
    Alert.alert('Exit list?', `Leave "${name}"? You can rejoin later with the share code.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Exit',
        style: 'destructive',
        onPress: () => onLeaveList(listId),
      },
    ]);
  };

  if (hidden) return (
    <ListNameModal
      visible={isListNameModalOpen}
      mode={listNameMode}
      value={listNameInput}
      error={listNameError}
      onChange={onChangeListName}
      onSubmit={onSubmitListName}
      onClose={onCloseListNameModal}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Lists"
        subtitle="Choose a list or create a new one"
        onOpenSettings={onOpenSettings}
      >
        <Pressable
          style={styles.iconButton}
          onPress={onOpenJoinListModal}
          accessibilityRole="button"
          accessibilityLabel="Join a shared list"
        >
          <Ionicons name="link-outline" size={20} color="#4a4a4a" />
        </Pressable>
      </Header>

      {lists.length === 0 ? (
        <View style={styles.listsEmptyState}>
          <Text style={styles.emptyTitle}>No lists yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap + to create your first shopping list.
          </Text>
        </View>
      ) : (
        <FlatList
          data={lists}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const completedCount = item.items.filter((entry) => entry.purchased).length;
            const isOwner = !item.ownerId || item.ownerId === currentUserId;
            const isShared = !!item.ownerId && item.ownerId !== currentUserId;
            return (
              <View style={styles.listCard}>
                <Pressable
                  style={styles.listCardMain}
                  onPress={() => onOpenList(item.id)}
                >
                  <View style={styles.listCardTitleRow}>
                    <Text style={styles.listCardTitle}>{item.name}</Text>
                    {isShared && (
                      <Ionicons
                        name="people-outline"
                        size={16}
                        color="#7c7c7c"
                        style={styles.listCardSharedIcon}
                      />
                    )}
                  </View>
                  <Text style={styles.listCardMeta}>
                    {getItemsLabel(item.items.length)} • {completedCount} completed
                  </Text>
                </Pressable>
                <View style={styles.listCardActions}>
                  {isOwner && (
                    <Pressable
                      style={styles.listCardActionButton}
                      onPress={() => onOpenRenameListModal(item.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Rename ${item.name}`}
                    >
                      <Ionicons name="create-outline" size={18} color="#4a4a4a" />
                    </Pressable>
                  )}
                  {isOwner ? (
                    <Pressable
                      style={styles.listCardActionButton}
                      onPress={() => handleDeleteList(item.id, item.name)}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${item.name}`}
                    >
                      <Ionicons name="trash-outline" size={18} color="#9a3d3d" />
                    </Pressable>
                  ) : (
                    <Pressable
                      style={styles.listCardActionButton}
                      onPress={() => handleLeaveList(item.id, item.name)}
                      accessibilityRole="button"
                      accessibilityLabel={`Exit ${item.name}`}
                    >
                      <Ionicons name="exit-outline" size={18} color="#b07020" />
                    </Pressable>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}

      <Fab onPress={onOpenCreateListModal} />

      <ListNameModal
        visible={isListNameModalOpen}
        mode={listNameMode}
        value={listNameInput}
        error={listNameError}
        onChange={onChangeListName}
        onSubmit={onSubmitListName}
        onClose={onCloseListNameModal}
      />

      <StatusBar style="dark" />
    </SafeAreaView>
  );
};
