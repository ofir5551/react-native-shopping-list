import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Alert, FlatList, Pressable, SafeAreaView, Text, View } from 'react-native';
import { Fab } from '../components/Fab';
import { ListNameModal } from '../components/ListNameModal';
import { Header } from '../components/Header';
import { styles } from '../styles/appStyles';
import { ShoppingList } from '../types';

type ListsScreenProps = {
  lists: ShoppingList[];
  onOpenList: (listId: string) => void;
  onOpenCreateListModal: () => void;
  onOpenRenameListModal: (listId: string) => void;
  onDeleteList: (listId: string) => void;
  isListNameModalOpen: boolean;
  listNameMode: 'create' | 'rename';
  listNameInput: string;
  listNameError: string;
  onChangeListName: (value: string) => void;
  onCloseListNameModal: () => void;
  onSubmitListName: () => void;
};

const getItemsLabel = (count: number) => (count === 1 ? '1 item' : `${count} items`);

export const ListsScreen = ({
  lists,
  onOpenList,
  onOpenCreateListModal,
  onOpenRenameListModal,
  onDeleteList,
  isListNameModalOpen,
  listNameMode,
  listNameInput,
  listNameError,
  onChangeListName,
  onCloseListNameModal,
  onSubmitListName,
}: ListsScreenProps) => {
  const handleDeleteList = (listId: string, name: string) => {
    Alert.alert('Delete list?', `Delete "${name}" permanently?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => onDeleteList(listId),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Lists" subtitle="Choose a list or create a new one" />

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
            return (
              <View style={styles.listCard}>
                <Pressable
                  style={styles.listCardMain}
                  onPress={() => onOpenList(item.id)}
                >
                  <Text style={styles.listCardTitle}>{item.name}</Text>
                  <Text style={styles.listCardMeta}>
                    {getItemsLabel(item.items.length)} • {completedCount} completed
                  </Text>
                </Pressable>
                <View style={styles.listCardActions}>
                  <Pressable
                    style={styles.listCardActionButton}
                    onPress={() => onOpenRenameListModal(item.id)}
                  >
                    <Text style={styles.listCardActionText}>Rename</Text>
                  </Pressable>
                  <Pressable
                    style={styles.listCardActionButton}
                    onPress={() => handleDeleteList(item.id, item.name)}
                  >
                    <Text style={styles.listCardDeleteText}>Delete</Text>
                  </Pressable>
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
