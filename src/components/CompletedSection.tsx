import React from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { ShoppingItem } from '../types';
import { useAppStyles } from '../styles/appStyles';
import { ItemRow } from './ItemRow';

type CompletedSectionProps = {
  items: ShoppingItem[];
  isExpanded: boolean;
  showCompleted?: boolean;
  onToggleExpanded: () => void;
  onToggleItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onIncrementItem: (id: string) => void;
  onDecrementItem: (id: string) => void;
};

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
  return (
    <View style={styles.completedSection}>
      <Pressable style={styles.completedHeader} onPress={onToggleExpanded}>
        <Text style={styles.completedTitle}>Completed ({items.length})</Text>
        <Text style={styles.completedChevron}>{isExpanded ? '▾' : '▸'}</Text>
      </Pressable>

      {isExpanded && (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
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
      )}
    </View>
  );
};
