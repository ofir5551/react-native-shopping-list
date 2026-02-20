import React from 'react';
import { FlatList } from 'react-native';
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
  return (
    <FlatList
      data={activeItems}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ListFooterComponent={
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
        ) : null
      }
      renderItem={({ item }) => (
        <ItemRow
          item={item}
          onToggle={onToggleItem}
          onDelete={onDeleteItem}
          onIncrement={onIncrementItem}
          onDecrement={onDecrementItem}
        />
      )}
    />
  );
};
