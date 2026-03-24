import React, { useCallback } from 'react';
import { FlatList, ListRenderItemInfo, Pressable, Text, View } from 'react-native';
import { ShoppingItem } from '../types';
import { useAppStyles } from '../styles/appStyles';
import { ItemRow } from './ItemRow';
import { useLocale } from '../i18n/LocaleContext';

type CompletedSectionProps = {
  items: ShoppingItem[];
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onToggleItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onIncrementItem: (id: string) => void;
  onDecrementItem: (id: string) => void;
};

const keyExtractor = (item: ShoppingItem) => item.id;

export const CompletedSection = ({
  items,
  isExpanded,
  onToggleExpanded,
  onToggleItem,
  onDeleteItem,
  onIncrementItem,
  onDecrementItem,
}: CompletedSectionProps) => {
  const styles = useAppStyles();
  const { t } = useLocale();

  const renderItem = useCallback(({ item }: ListRenderItemInfo<ShoppingItem>) => (
    <ItemRow
      item={item}
      onToggle={onToggleItem}
      onDelete={onDeleteItem}
      onIncrement={onIncrementItem}
      onDecrement={onDecrementItem}
    />
  ), [onToggleItem, onDeleteItem, onIncrementItem, onDecrementItem]);

  return (
    <View style={styles.completedSection}>
      <Pressable style={styles.completedHeader} onPress={onToggleExpanded}>
        <Text style={styles.completedTitle}>{t('completed.header', { count: items.length })}</Text>
        <Text style={styles.completedChevron}>{isExpanded ? '▾' : '▸'}</Text>
      </Pressable>

      {isExpanded && (
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          scrollEnabled={false}
          renderItem={renderItem}
        />
      )}
    </View>
  );
};
