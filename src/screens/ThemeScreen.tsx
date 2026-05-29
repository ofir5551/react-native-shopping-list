import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../i18n/LocaleContext';
import { useAppStyles } from '../styles/appStyles';
import { PALETTES, ThemeId } from '../styles/palettes';

type Props = { onBack: () => void };

const LIGHT_IDS: ThemeId[] = ['natural', 'ocean', 'sunset', 'lavender'];
const DARK_IDS: ThemeId[] = ['midnight', 'navy', 'charcoal', 'plum'];

export const ThemeScreen = ({ onBack }: Props) => {
  const styles = useAppStyles();
  const { theme, themeId, setThemeId, isDark } = useTheme();
  const { t, isRTL } = useLocale();

  const renderPalette = (id: ThemeId) => {
    const p = PALETTES[id];
    const isActive = themeId === id;
    return (
      <Pressable
        key={id}
        onPress={() => setThemeId(id)}
        style={({ pressed }) => ({
          flex: 1,
          borderRadius: theme.borderRadius.lg,
          overflow: 'hidden',
          borderWidth: 2,
          borderColor: isActive ? p.colors.primary : 'transparent',
          opacity: pressed ? 0.85 : 1,
        })}
        accessibilityRole="radio"
        accessibilityState={{ selected: isActive }}
        accessibilityLabel={t(`theme.${id}` as any)}
      >
        {/* Card body — colored in the palette's own background */}
        <View style={{ backgroundColor: p.colors.background, padding: 12 }}>
          {/* Three color dots: background · primary · surface */}
          <View style={{ flexDirection: 'row', gap: 5, marginBottom: 8 }}>
            <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: p.colors.background, borderWidth: 1, borderColor: p.colors.border }} />
            <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: p.colors.primary }} />
            <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: p.colors.surfaceHighlight, borderWidth: 1, borderColor: p.colors.border }} />
          </View>
          {/* Mini list preview */}
          <View style={{ backgroundColor: p.colors.surface, borderRadius: 6, padding: 7, gap: 4 }}>
            <View style={{ width: '55%', height: 6, borderRadius: 3, backgroundColor: p.colors.primary, opacity: 0.85 }} />
            <View style={{ height: 1, backgroundColor: p.colors.border }} />
            <View style={{ width: '85%', height: 5, borderRadius: 2.5, backgroundColor: p.colors.text, opacity: 0.6 }} />
            <View style={{ width: '70%', height: 5, borderRadius: 2.5, backgroundColor: p.colors.text, opacity: 0.35 }} />
          </View>
        </View>
        {/* Name bar — colored in the palette's primary */}
        <View style={{ backgroundColor: p.colors.primary, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 12, fontFamily: theme.fonts.semibold, color: p.colors.primaryText }}>
            {t(`theme.${id}` as any)}
          </Text>
          {isActive && (
            <Ionicons name="checkmark" size={14} color={p.colors.primaryText} />
          )}
        </View>
      </Pressable>
    );
  };

  const renderSection = (label: string, ids: ThemeId[]) => (
    <View style={{ marginBottom: 24 }}>
      <Text style={[styles.settingsSectionTitle, { marginBottom: 10 }]}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
        {renderPalette(ids[0])}
        {renderPalette(ids[1])}
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {renderPalette(ids[2])}
        {renderPalette(ids[3])}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Pressable
              style={[styles.overlayBackBtn, { marginRight: 12 }]}
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel={t('common.goBack')}
            >
              <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={theme.colors.text} />
            </Pressable>
            <Text style={styles.title}>{t('theme.title')}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {renderSection(t('theme.lightThemes'), LIGHT_IDS)}
        {renderSection(t('theme.darkThemes'), DARK_IDS)}
      </ScrollView>

      <StatusBar style={isDark ? 'light' : 'dark'} />
    </SafeAreaView>
  );
};
