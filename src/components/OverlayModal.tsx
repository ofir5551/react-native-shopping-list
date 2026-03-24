import React, { useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  LayoutAnimation,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppStyles } from '../styles/appStyles';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';
import { useLocale } from '../i18n/LocaleContext';
import { SelectedRecentItem } from '../types';

type OverlayModalProps = {
  visible: boolean;
  overlayInput: string;
  onChangeInput: (value: string) => void;
  onAddInput: () => void;
  suggestions: string[];
  selectedRecent: SelectedRecentItem[];
  onToggleRecent: (name: string) => void;
  onUpdateRecentQuantity: (name: string, delta: number) => void;
  onDismissSuggestion: (name: string) => void;
  onClose: () => void;
};

type TabKey = 'suggestions' | 'catalog';

const triggerHaptic = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
};

export const OverlayModal = ({
  visible,
  overlayInput,
  onChangeInput,
  onAddInput,
  suggestions,
  selectedRecent,
  onToggleRecent,
  onUpdateRecentQuantity,
  onDismissSuggestion,
  onClose,
}: OverlayModalProps) => {
  const styles = useAppStyles();
  const { theme } = useTheme();
  const { preferences } = usePreferences();
  const { t, isRTL } = useLocale();
  const inputRef = useRef<TextInput | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('suggestions');

  const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'suggestions', label: t('overlay.suggestions'), icon: 'sparkles' },
    { key: 'catalog', label: t('overlay.catalog'), icon: 'grid-outline' },
  ];

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  useEffect(() => {
    if (visible && preferences.autoFocusKeyboard) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible, preferences.autoFocusKeyboard]);

  const handleAdd = () => {
    onAddInput();
    inputRef.current?.focus();
  };

  const handleItemPress = (name: string) => {
    triggerHaptic();
    const existing = selectedRecent.find((s) => s.name === name);
    if (existing) {
      onUpdateRecentQuantity(name, 1);
    } else {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      onToggleRecent(name);
    }
  };

  const renderItemRow = (name: string) => {
    const selected = selectedRecent.find((s) => s.name === name);
    const quantity = selected?.quantity ?? 0;

    return (
      <Pressable
        key={name}
        style={({ pressed }) => [styles.itemListRow, selected && styles.itemListRowSelected, pressed && { opacity: 0.7 }]}
        onPress={() => handleItemPress(name)}
        onLongPress={() => {
          if (!selected) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            triggerHaptic();
            onDismissSuggestion(name);
          }
        }}
        accessibilityRole="button"
        accessibilityLabel={selected ? t('overlay.addMore', { name }) : t('overlay.addItem', { name })}
        android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
      >
        <Ionicons name="add-circle-outline" size={26} color={selected ? theme.colors.primary : theme.colors.textSecondary} style={styles.itemListRowAddBtn} />
        <Text style={[styles.itemListRowName, selected && styles.itemListRowNameSelected]}>
          {name}
        </Text>
        {selected && quantity > 1 && (
          <Text style={styles.itemListRowQuantity}>{quantity}</Text>
        )}
        {selected && (
          <Pressable
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              triggerHaptic();
              if (quantity > 1) {
                onUpdateRecentQuantity(name, -1);
              } else {
                onToggleRecent(name);
              }
            }}
            onLongPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              triggerHaptic();
              onToggleRecent(name);
            }}
            style={({ pressed }) => [styles.itemListRowRemoveBtn, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel={quantity > 1 ? t('overlay.decreaseQty', { name }) : t('overlay.removeItem', { name })}
          >
            <Ionicons
              name={quantity > 1 ? 'remove-circle-outline' : 'close-circle-outline'}
              size={22}
              color={quantity > 1 ? theme.colors.textSecondary : theme.colors.danger}
            />
          </Pressable>
        )}
      </Pressable>
    );
  };

  const renderSuggestionsTab = () => {
    if (suggestions.length === 0) {
      return <Text style={styles.recentsEmpty}>{t('overlay.noSuggestions')}</Text>;
    }
    return <View>{suggestions.map((item) => renderItemRow(item))}</View>;
  };

  const renderCatalogTab = () => (
    <View style={{ alignItems: 'center', paddingVertical: 40 }}>
      <Ionicons name="grid-outline" size={40} color={theme.colors.textSecondary} />
      <Text style={{ fontSize: 16, color: theme.colors.textSecondary, marginTop: 12, fontWeight: '600' }}>
        {t('overlay.comingSoon')}
      </Text>
      <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginTop: 4, textAlign: 'center' }}>
        {t('overlay.browseByCategory')}
      </Text>
    </View>
  );

  if (!visible) return null;

  return (
    <SafeAreaView style={styles.overlayFullScreen}>
      <View style={styles.overlayTopRow}>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [styles.overlayBackBtn, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel={t('header.goBack')}
        >
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={theme.colors.text} />
        </Pressable>

        {/* Search input */}
        <View style={styles.overlaySearchBar}>
          <Ionicons name="search" size={18} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            ref={inputRef}
            placeholder={t('overlay.addNewItem')}
            value={overlayInput}
            onChangeText={onChangeInput}
            onSubmitEditing={handleAdd}
            blurOnSubmit={false}
            returnKeyType="send"
            style={styles.overlaySearchInput}
            placeholderTextColor={theme.colors.textSecondary}
          />
          {overlayInput.trim().length > 0 && (
            <Pressable
              style={styles.addButton}
              onPress={handleAdd}
              accessibilityRole="button"
              accessibilityLabel={t('overlay.addTypedItem')}
            >
              <Text style={styles.addButtonText}>{t('overlay.add')}</Text>
            </Pressable>
          )}
        </View>

        {/* Mic + Camera placeholders */}
        <Pressable style={styles.overlayActionIcon} disabled>
          <Ionicons name="mic-outline" size={22} color={theme.colors.textSecondary} />
        </Pressable>
        <Pressable style={styles.overlayActionIcon} disabled>
          <Ionicons name="camera-outline" size={22} color={theme.colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.modalContent}>

        {/* Tab bar */}
        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[styles.tabBarItem, isActive && styles.tabBarItemActive]}
                onPress={() => setActiveTab(tab.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons
                    name={tab.icon}
                    size={16}
                    color={isActive ? theme.colors.primary : theme.colors.textSecondary}
                  />
                  <Text style={[styles.tabBarText, isActive && styles.tabBarTextActive]}>
                    {tab.label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Tab content */}
        <ScrollView
          style={styles.overlaySectionsScroll}
          contentContainerStyle={styles.overlaySectionsContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {activeTab === 'suggestions' && renderSuggestionsTab()}
          {activeTab === 'catalog' && renderCatalogTab()}
        </ScrollView>
      </View>

    </SafeAreaView>
  );
};
