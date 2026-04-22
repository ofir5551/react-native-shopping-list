import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, SectionList, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppStyles } from '../styles/appStyles';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../i18n/LocaleContext';
import type { ShoppingItem, ShoppingList } from '../types';

type Candidate = {
  name: string;
  quantity: number;
  normalizedName: string;
};

type Section = {
  listName: string;
  data: Candidate[];
};

export function buildCandidates(
  currentListId: string,
  currentListItems: ShoppingItem[],
  allLists: ShoppingList[]
): Section[] {
  const activeInCurrent = new Set(
    currentListItems
      .filter((i) => !i.purchased)
      .map((i) => i.name.toLowerCase().trim())
  );

  const otherLists = allLists
    .filter((l) => l.id !== currentListId)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const seen = new Map<string, { name: string; quantity: number; listName: string }>();
  for (const list of otherLists) {
    for (const item of list.items) {
      if (item.purchased) continue;
      const normalized = item.name.toLowerCase().trim();
      if (!seen.has(normalized)) {
        seen.set(normalized, { name: item.name, quantity: item.quantity, listName: list.name });
      }
    }
  }

  const byList = new Map<string, Candidate[]>();
  for (const [normalizedName, { name, quantity, listName }] of seen) {
    if (activeInCurrent.has(normalizedName)) continue;
    if (!byList.has(listName)) byList.set(listName, []);
    byList.get(listName)!.push({ name, quantity, normalizedName });
  }

  // Preserve source list order (most recently updated first)
  const sections: Section[] = [];
  for (const list of otherLists) {
    const candidates = byList.get(list.name);
    if (candidates && candidates.length > 0) {
      sections.push({ listName: list.name, data: candidates });
    }
  }
  return sections;
}

const triggerHaptic = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
};

type Props = {
  visible: boolean;
  currentListId: string;
  currentListItems: ShoppingItem[];
  allLists: ShoppingList[];
  onAdd: (items: { name: string; quantity: number }[]) => void;
  onClose: () => void;
};

export const AddFromOtherListsModal = ({
  visible,
  currentListId,
  currentListItems,
  allLists,
  onAdd,
  onClose,
}: Props) => {
  const styles = useAppStyles();
  const { theme } = useTheme();
  const { t } = useLocale();

  const sections = useMemo(
    () => buildCandidates(currentListId, currentListItems, allLists),
    [currentListId, currentListItems, allLists]
  );

  const allNormalized = useMemo(
    () => new Set(sections.flatMap((s) => s.data.map((i) => i.normalizedName))),
    [sections]
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) {
      setSelected(new Set(allNormalized));
    }
  }, [visible]);

  const allSelected = selected.size === allNormalized.size && allNormalized.size > 0;

  const toggleItem = (normalizedName: string) => {
    triggerHaptic();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(normalizedName)) {
        next.delete(normalizedName);
      } else {
        next.add(normalizedName);
      }
      return next;
    });
  };

  const toggleAll = () => {
    triggerHaptic();
    setSelected(allSelected ? new Set() : new Set(allNormalized));
  };

  const handleConfirm = () => {
    triggerHaptic();
    const items = sections
      .flatMap((s) => s.data)
      .filter((i) => selected.has(i.normalizedName))
      .map((i) => ({ name: i.name, quantity: i.quantity }));
    onAdd(items);
  };

  const isEmpty = sections.length === 0;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.modalPanel, { maxHeight: '85%' }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('caret.addFromOtherLists')}</Text>
            <Pressable onPress={onClose} style={styles.modalCloseButton}>
              <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          {isEmpty ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 }}>
              <Text style={{ fontSize: 15, color: theme.colors.textSecondary, textAlign: 'center' }}>
                {t('addFromOtherLists.noItems')}
              </Text>
            </View>
          ) : (
            <SectionList
              style={{ flex: 1 }}
              sections={sections}
              keyExtractor={(item) => item.normalizedName}
              renderSectionHeader={({ section }) => (
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: theme.fonts.semibold,
                    color: theme.colors.textSecondary,
                    paddingTop: 16,
                    paddingBottom: 4,
                    backgroundColor: theme.colors.background,
                  }}
                >
                  {section.listName}
                </Text>
              )}
              renderItem={({ item }) => {
                const isSelected = selected.has(item.normalizedName);
                return (
                  <Pressable
                    onPress={() => toggleItem(item.normalizedName)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.colors.border,
                      opacity: pressed ? 0.7 : 1,
                    })}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={item.name}
                  >
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={24}
                      color={isSelected ? theme.colors.primary : theme.colors.border}
                      style={{ marginRight: 12 }}
                    />
                    <Text style={{ flex: 1, fontSize: 16, color: theme.colors.text }}>
                      {item.name}
                    </Text>
                    {item.quantity > 1 && (
                      <Text style={{ fontSize: 14, color: theme.colors.textSecondary }}>
                        ×{item.quantity}
                      </Text>
                    )}
                  </Pressable>
                );
              }}
              showsVerticalScrollIndicator={false}
            />
          )}

          {!isEmpty && (
            <View
              style={{
                paddingVertical: 16,
                paddingBottom: 20,
                borderTopWidth: 1,
                borderColor: theme.colors.border,
                flexDirection: 'row',
                gap: 8,
              }}
            >
              <Pressable
                onPress={toggleAll}
                style={({ pressed }) => ({
                  flex: 1,
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: theme.colors.surfaceHighlight,
                  alignItems: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
                accessibilityRole="button"
              >
                <Text style={{ fontSize: 15, fontFamily: theme.fonts.semibold, color: theme.colors.text }}>
                  {allSelected ? t('addFromOtherLists.unselectAll') : t('addFromOtherLists.selectAll')}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleConfirm}
                disabled={selected.size === 0}
                style={({ pressed }) => ({
                  flex: 2,
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor:
                    selected.size === 0 ? theme.colors.surfaceHighlight : theme.colors.primary,
                  alignItems: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
                accessibilityRole="button"
                accessibilityLabel={t('addFromOtherLists.addCount', { count: selected.size })}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontFamily: theme.fonts.semibold,
                    color: selected.size === 0 ? theme.colors.textSecondary : theme.colors.primaryText,
                  }}
                >
                  {t('addFromOtherLists.addCount', { count: selected.size })}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};
