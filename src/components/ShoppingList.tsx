import React, { useCallback, useMemo } from 'react';
import { FlatList, ListRenderItemInfo } from 'react-native';
import { ShoppingItem } from '../types';
import { useAppStyles } from '../styles/appStyles';
import { CompletedSection } from './CompletedSection';
import { ItemRow } from './ItemRow';

type ShoppingListProps = {
  activeItems: ShoppingItem[];
  completedItems: ShoppingItem[];
  showCompleted: boolean;
  onToggleCompleted: () => void;
  onToggleItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onIncrementItem: (id: string) => void;
  onDecrementItem: (id: string) => void;
};

const keyExtractor = (item: ShoppingItem) => item.id;

export const ShoppingList = ({
  activeItems,
  completedItems,
  showCompleted,
  onToggleCompleted,
  onToggleItem,
  onDeleteItem,
  onIncrementItem,
  onDecrementItem,
}: ShoppingListProps) => {
  const styles = useAppStyles();

  const renderItem = useCallback(({ item }: ListRenderItemInfo<ShoppingItem>) => (
    <ItemRow
      item={item}
      onToggle={onToggleItem}
      onDelete={onDeleteItem}
      onIncrement={onIncrementItem}
      onDecrement={onDecrementItem}
    />
  ), [onToggleItem, onDeleteItem, onIncrementItem, onDecrementItem]);

  const footer = useMemo(() =>
    completedItems.length > 0 ? (
      <CompletedSection
        items={completedItems}
        isExpanded={showCompleted}
        onToggleExpanded={onToggleCompleted}
        onToggleItem={onToggleItem}
        onDeleteItem={onDeleteItem}
        onIncrementItem={onIncrementItem}
        onDecrementItem={onDecrementItem}
      />
    ) : null,
  [completedItems, showCompleted, onToggleCompleted, onToggleItem, onDeleteItem, onIncrementItem, onDecrementItem]);

  return (
    <FlatList
      data={activeItems}
      keyExtractor={keyExtractor}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.list}
      ListFooterComponent={footer}
      renderItem={renderItem}
    />
  );
};
