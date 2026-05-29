import { StatusBar } from 'expo-status-bar';
import React, { useCallback } from 'react';
import { FlatList, ListRenderItemInfo, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { useAppStyles } from '../styles/appStyles';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../i18n/LocaleContext';
import { pluralItemCount } from '../i18n/index';
import { ShoppingList } from '../types';

type ArchiveScreenProps = {
  archivedLists: ShoppingList[];
  onOpenList: (listId: string) => void;
  onBack: () => void;
};

const keyExtractor = (item: ShoppingList) => item.id;

export const ArchiveScreen = ({ archivedLists, onOpenList, onBack }: ArchiveScreenProps) => {
  const styles = useAppStyles();
  const { theme, isDark } = useTheme();
  const { t } = useLocale();

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ShoppingList>) => {
      const completedCount = item.items.filter((i) => i.purchased).length;
      return (
        <Pressable
          style={({ pressed }) => [styles.listCard, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => onOpenList(item.id)}
          accessibilityRole="button"
          accessibilityLabel={item.name}
        >
          <View style={styles.listCardRow}>
            <View style={styles.listCardMain}>
              <Text style={styles.listCardTitle}>{item.name}</Text>
              <Text style={styles.listCardMeta}>
                {pluralItemCount(t, item.items.length)} • {completedCount} {t('lists.completed')}
              </Text>
            </View>
          </View>
        </Pressable>
      );
    },
    [onOpenList, styles, t]
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header title={t('lists.archiveTitle')} onBack={onBack} />

      {archivedLists.length === 0 ? (
        <View style={styles.listsEmptyState}>
          <Text style={styles.emptyTitle}>{t('lists.noArchived')}</Text>
        </View>
      ) : (
        <FlatList
          data={archivedLists}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
        />
      )}

      <StatusBar style={isDark ? 'light' : 'dark'} />
    </SafeAreaView>
  );
};
