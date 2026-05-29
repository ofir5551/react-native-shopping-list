# Theme Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the binary dark-mode toggle in Settings with a dedicated Theme Selection screen offering 8 named palettes (4 light, 4 dark) in a 2-column swatch grid.

**Architecture:** A new `src/styles/palettes.ts` defines all 8 palettes as full `Theme` objects tagged with `id` and `isDark`. `ThemeContext` is rewritten to store a `ThemeId` string and look up the active palette; it migrates old `'light'/'dark'/'system'` AsyncStorage values on first load. A new `ThemeScreen` is pushed from Settings via the existing route/navigation pattern.

**Tech Stack:** React Native, Expo, TypeScript, AsyncStorage, `@testing-library/react-native` (renderHook), existing `useTheme` / `useLocale` / `useAppStyles` hooks.

---

## File Map

| Status | Path | Purpose |
|---|---|---|
| **Create** | `src/styles/palettes.ts` | `ThemeId`, `Palette` type, all 8 palettes, `DEFAULT_THEME_ID`, `resolveThemeId` migration fn |
| **Create** | `src/context/ThemeContext.test.ts` | Unit tests for `resolveThemeId` migration logic |
| **Create** | `src/screens/ThemeScreen.tsx` | New theme selection screen |
| **Modify** | `src/context/ThemeContext.tsx` | Rewrite: use `themeId`/`setThemeId`, remove `ThemeType` + `useColorScheme` |
| **Modify** | `src/styles/theme.ts` | Remove `lightTheme`/`darkTheme` exports |
| **Modify** | `src/i18n/translations/en.ts` | Add 12 new translation keys |
| **Modify** | `src/i18n/translations/he.ts` | Add 12 new translation keys (Hebrew) |
| **Modify** | `src/types.ts` | Add `\| { name: 'theme' }` to `AppRoute` |
| **Modify** | `src/hooks/useShoppingListsApp.ts` | Add `goToTheme` nav function |
| **Modify** | `src/screens/HomeScreen.tsx` | Render `ThemeScreen`, pass `onTheme` to `SettingsScreen` |
| **Modify** | `src/screens/SettingsScreen.tsx` | Remove dark-mode Switch, add "Theme" Pressable row |

---

## Task 1: Create palette definitions

**Files:**
- Create: `src/styles/palettes.ts`

- [ ] **Step 1: Create `src/styles/palettes.ts`**

```typescript
import { Theme } from './theme';

export type ThemeId =
  | 'natural' | 'ocean' | 'sunset' | 'lavender'
  | 'midnight' | 'navy' | 'charcoal' | 'plum';

export type Palette = Theme & { id: ThemeId; isDark: boolean };

const fonts = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
};

const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
const borderRadius = { sm: 8, md: 12, lg: 16, round: 999 };

export const PALETTES: Record<ThemeId, Palette> = {
  natural: {
    id: 'natural', isDark: false, fonts, spacing, borderRadius,
    colors: {
      background: '#f3ede4', surface: '#fdfaf6', surfaceHighlight: '#e8ddd0',
      primary: '#196b4e', primaryText: '#ffffff',
      text: '#1a1612', textSecondary: '#6e5e50',
      border: '#cfc0ad', danger: '#8a3232', dangerSurface: '#fce8e8',
      inputBackground: '#fdfaf6', backdrop: 'rgba(26, 22, 18, 0.4)', syncActive: '#196b4e',
    },
  },
  ocean: {
    id: 'ocean', isDark: false, fonts, spacing, borderRadius,
    colors: {
      background: '#edf4fc', surface: '#f4f9ff', surfaceHighlight: '#dceeff',
      primary: '#1a6fa8', primaryText: '#ffffff',
      text: '#0e1f2e', textSecondary: '#4a6a84',
      border: '#b8d4ec', danger: '#8a3232', dangerSurface: '#fce8e8',
      inputBackground: '#f4f9ff', backdrop: 'rgba(14, 31, 46, 0.4)', syncActive: '#1a6fa8',
    },
  },
  sunset: {
    id: 'sunset', isDark: false, fonts, spacing, borderRadius,
    colors: {
      background: '#fdf0ea', surface: '#fffaf7', surfaceHighlight: '#ffe8dc',
      primary: '#c4522a', primaryText: '#ffffff',
      text: '#2a1408', textSecondary: '#7a4a34',
      border: '#ddc0b0', danger: '#8a3232', dangerSurface: '#fce8e8',
      inputBackground: '#fffaf7', backdrop: 'rgba(42, 20, 8, 0.4)', syncActive: '#c4522a',
    },
  },
  lavender: {
    id: 'lavender', isDark: false, fonts, spacing, borderRadius,
    colors: {
      background: '#f5f0ff', surface: '#faf7ff', surfaceHighlight: '#ede4ff',
      primary: '#6b3fa0', primaryText: '#ffffff',
      text: '#1a0e2a', textSecondary: '#5a4270',
      border: '#c8b8e0', danger: '#8a3232', dangerSurface: '#fce8e8',
      inputBackground: '#faf7ff', backdrop: 'rgba(26, 14, 42, 0.4)', syncActive: '#6b3fa0',
    },
  },
  midnight: {
    id: 'midnight', isDark: true, fonts, spacing, borderRadius,
    colors: {
      background: '#16130e', surface: '#201d17', surfaceHighlight: '#2b271f',
      primary: '#2a9470', primaryText: '#ffffff',
      text: '#eae4da', textSecondary: '#9e8f7c',
      border: '#3b3529', danger: '#d46f7a', dangerSurface: '#3d2525',
      inputBackground: '#2b271f', backdrop: 'rgba(0, 0, 0, 0.65)', syncActive: '#2a9470',
    },
  },
  navy: {
    id: 'navy', isDark: true, fonts, spacing, borderRadius,
    colors: {
      background: '#0d1520', surface: '#162030', surfaceHighlight: '#1e2d40',
      primary: '#4a9fd4', primaryText: '#ffffff',
      text: '#d0e8f5', textSecondary: '#6a8aa0',
      border: '#253545', danger: '#d46f7a', dangerSurface: '#3d2525',
      inputBackground: '#1e2d40', backdrop: 'rgba(0, 0, 0, 0.65)', syncActive: '#4a9fd4',
    },
  },
  charcoal: {
    id: 'charcoal', isDark: true, fonts, spacing, borderRadius,
    colors: {
      background: '#181818', surface: '#242424', surfaceHighlight: '#2e2e2e',
      primary: '#e07b39', primaryText: '#ffffff',
      text: '#f0ece8', textSecondary: '#8a8078',
      border: '#383838', danger: '#d46f7a', dangerSurface: '#3d2525',
      inputBackground: '#2e2e2e', backdrop: 'rgba(0, 0, 0, 0.65)', syncActive: '#e07b39',
    },
  },
  plum: {
    id: 'plum', isDark: true, fonts, spacing, borderRadius,
    colors: {
      background: '#1a1022', surface: '#261535', surfaceHighlight: '#321a44',
      primary: '#9b6fd4', primaryText: '#ffffff',
      text: '#ede4ff', textSecondary: '#7a5a9a',
      border: '#3d2055', danger: '#d46f7a', dangerSurface: '#3d2525',
      inputBackground: '#321a44', backdrop: 'rgba(0, 0, 0, 0.65)', syncActive: '#9b6fd4',
    },
  },
};

export const DEFAULT_THEME_ID: ThemeId = 'natural';

const VALID_IDS = new Set<string>(Object.keys(PALETTES));

export function resolveThemeId(stored: string | null): ThemeId {
  if (stored === null) return DEFAULT_THEME_ID;
  if (VALID_IDS.has(stored)) return stored as ThemeId;
  if (stored === 'dark') return 'midnight';
  return DEFAULT_THEME_ID; // 'light', 'system', or unknown → natural
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/palettes.ts
git commit -m "feat(theme): add palette definitions and resolveThemeId"
```

---

## Task 2: Test the migration logic

**Files:**
- Create: `src/context/ThemeContext.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/context/ThemeContext.test.ts
import { resolveThemeId, DEFAULT_THEME_ID } from '../styles/palettes';

describe('resolveThemeId', () => {
  it('returns natural for null (fresh install)', () => {
    expect(resolveThemeId(null)).toBe('natural');
  });

  it('returns natural for stored "light" (migration)', () => {
    expect(resolveThemeId('light')).toBe('natural');
  });

  it('returns natural for stored "system" (migration)', () => {
    expect(resolveThemeId('system')).toBe('natural');
  });

  it('returns midnight for stored "dark" (migration)', () => {
    expect(resolveThemeId('dark')).toBe('midnight');
  });

  it('returns the stored ThemeId unchanged when valid', () => {
    expect(resolveThemeId('ocean')).toBe('ocean');
    expect(resolveThemeId('sunset')).toBe('sunset');
    expect(resolveThemeId('lavender')).toBe('lavender');
    expect(resolveThemeId('midnight')).toBe('midnight');
    expect(resolveThemeId('navy')).toBe('navy');
    expect(resolveThemeId('charcoal')).toBe('charcoal');
    expect(resolveThemeId('plum')).toBe('plum');
  });

  it('returns the DEFAULT_THEME_ID for unknown strings', () => {
    expect(resolveThemeId('banana')).toBe(DEFAULT_THEME_ID);
  });
});
```

- [ ] **Step 2: Run tests — expect PASS (logic is already in palettes.ts)**

```bash
npm test -- --testPathPattern="ThemeContext" --no-coverage
```

Expected output: `Tests: 8 passed`

- [ ] **Step 3: Commit**

```bash
git add src/context/ThemeContext.test.ts
git commit -m "test(theme): add resolveThemeId migration tests"
```

---

## Task 3: Rewrite ThemeContext

**Files:**
- Modify: `src/context/ThemeContext.tsx`
- Modify: `src/styles/theme.ts`

- [ ] **Step 1: Rewrite `src/context/ThemeContext.tsx`**

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme } from '../styles/theme';
import { ThemeId, Palette, PALETTES, DEFAULT_THEME_ID, resolveThemeId } from '../styles/palettes';

type ThemeContextType = {
  theme: Theme;
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@shopping-list/theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeId, setThemeIdState] = useState<ThemeId>(DEFAULT_THEME_ID);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        setThemeIdState(resolveThemeId(stored));
      } catch (error) {
        console.warn('Failed to load theme preference', error);
      } finally {
        setIsReady(true);
      }
    };
    loadTheme();
  }, []);

  const setThemeId = async (id: ThemeId) => {
    setThemeIdState(id);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, id);
    } catch (error) {
      console.warn('Failed to save theme preference', error);
    }
  };

  const palette: Palette = PALETTES[themeId];

  if (!isReady) return null;

  return (
    <ThemeContext.Provider value={{ theme: palette, themeId, setThemeId, isDark: palette.isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
```

- [ ] **Step 2: Remove `lightTheme` and `darkTheme` from `src/styles/theme.ts`**

Delete the two exported constants (lines 45–107 of the original). Keep the `Theme` type and `fonts`/`spacing`/`borderRadius` only if needed elsewhere — but since `palettes.ts` duplicates those inline, just remove the unused exports. The file should end at the `Theme` type definition:

```typescript
export type Theme = {
  colors: {
    background: string;
    surface: string;
    surfaceHighlight: string;
    primary: string;
    primaryText: string;
    text: string;
    textSecondary: string;
    border: string;
    danger: string;
    dangerSurface: string;
    inputBackground: string;
    backdrop: string;
    syncActive: string;
  };
  fonts: {
    regular: string;
    medium: string;
    semibold: string;
    bold: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    round: number;
  };
};
```

- [ ] **Step 3: Run all tests**

```bash
npm test -- --no-coverage
```

Expected: all tests pass. If anything imports `lightTheme` or `darkTheme` from `theme.ts`, fix those imports now (there should be none — only `ThemeContext.tsx` used them and it's rewritten).

- [ ] **Step 4: Commit**

```bash
git add src/context/ThemeContext.tsx src/styles/theme.ts
git commit -m "feat(theme): rewrite ThemeContext to use palette IDs"
```

---

## Task 4: Add i18n keys

**Files:**
- Modify: `src/i18n/translations/en.ts`
- Modify: `src/i18n/translations/he.ts`

- [ ] **Step 1: Add keys to `src/i18n/translations/en.ts`**

Add after the `settings.listView.wide` line (inside the Settings section):

```typescript
  'settings.theme': 'Theme',
```

Add a new section at the end of the object, before the closing `} as const`:

```typescript
  // Theme selection screen
  'theme.title': 'Theme',
  'theme.lightThemes': 'Light Themes',
  'theme.darkThemes': 'Dark Themes',
  'theme.natural': 'Natural',
  'theme.ocean': 'Ocean',
  'theme.sunset': 'Sunset',
  'theme.lavender': 'Lavender',
  'theme.midnight': 'Midnight',
  'theme.navy': 'Navy',
  'theme.charcoal': 'Charcoal',
  'theme.plum': 'Plum',
```

- [ ] **Step 2: Add keys to `src/i18n/translations/he.ts`**

Add after `'settings.listView.wide'`:

```typescript
  'settings.theme': 'ערכת נושא',
```

Add at the end before the closing `}`:

```typescript
  // Theme selection screen
  'theme.title': 'ערכת נושא',
  'theme.lightThemes': 'ערכות בהירות',
  'theme.darkThemes': 'ערכות כהות',
  'theme.natural': 'טבעי',
  'theme.ocean': 'אוקיינוס',
  'theme.sunset': 'שקיעה',
  'theme.lavender': 'לבנדר',
  'theme.midnight': 'חצות',
  'theme.navy': 'נייבי',
  'theme.charcoal': 'פחם',
  'theme.plum': 'שזיף',
```

- [ ] **Step 3: Run tests (translations test validates full key coverage)**

```bash
npm test -- --testPathPattern="translations" --no-coverage
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/i18n/translations/en.ts src/i18n/translations/he.ts
git commit -m "feat(theme): add theme selection i18n keys"
```

---

## Task 5: Create ThemeScreen

**Files:**
- Create: `src/screens/ThemeScreen.tsx`

- [ ] **Step 1: Create `src/screens/ThemeScreen.tsx`**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/ThemeScreen.tsx
git commit -m "feat(theme): add ThemeScreen with 2-column palette grid"
```

---

## Task 6: Wire routing

**Files:**
- Modify: `src/types.ts` (line 30 — AppRoute union)
- Modify: `src/hooks/useShoppingListsApp.ts` (after `goToSignup`)
- Modify: `src/screens/HomeScreen.tsx`

- [ ] **Step 1: Add `'theme'` to `AppRoute` in `src/types.ts`**

Change:

```typescript
export type AppRoute =
  | { name: 'lists' }
  | { name: 'list'; listId: string }
  | { name: 'archive' }
  | { name: 'settings' }
  | { name: 'auth' }
  | { name: 'login' }
  | { name: 'signup' };
```

To:

```typescript
export type AppRoute =
  | { name: 'lists' }
  | { name: 'list'; listId: string }
  | { name: 'archive' }
  | { name: 'settings' }
  | { name: 'theme' }
  | { name: 'auth' }
  | { name: 'login' }
  | { name: 'signup' };
```

- [ ] **Step 2: Add `goToTheme` to `src/hooks/useShoppingListsApp.ts`**

After the `goToSettings` function (around line 449), add:

```typescript
  const goToTheme = () => {
    setRoute({ name: 'theme' });
  };
```

Also add `goToTheme` to the hook's return object (find the return statement and add it alongside `goToSettings`):

```typescript
  goToTheme,
```

And add it to the hook's TypeScript interface (find where `goToSettings: () => void;` is declared, around line 70, and add below it):

```typescript
  goToTheme: () => void;
```

- [ ] **Step 3: Update `src/screens/HomeScreen.tsx`**

Add the import:

```typescript
import { ThemeScreen } from './ThemeScreen';
```

Destructure `goToTheme` from `useShoppingListsApp()` (alongside `goToSettings`):

```typescript
    goToTheme,
```

Add the route handler (alongside the `route.name === 'settings'` block):

```typescript
  if (route.name === 'theme') {
    return <ThemeScreen onBack={goToSettings} />;
  }
```

Pass `onTheme` to `SettingsScreen` (find where `<SettingsScreen` is rendered):

```typescript
    return <SettingsScreen onBack={goToLists} onSignIn={goToAuth} onTheme={goToTheme} />;
```

- [ ] **Step 4: Run all tests**

```bash
npm test -- --no-coverage
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/hooks/useShoppingListsApp.ts src/screens/HomeScreen.tsx
git commit -m "feat(theme): wire theme route and goToTheme navigation"
```

---

## Task 7: Update SettingsScreen

**Files:**
- Modify: `src/screens/SettingsScreen.tsx`

- [ ] **Step 1: Update props type and imports**

Change the props type:

```typescript
type SettingsScreenProps = {
  onBack: () => void;
  onSignIn: () => void;
  onTheme: () => void;
};
```

Update the destructuring:

```typescript
export const SettingsScreen = ({ onBack, onSignIn, onTheme }: SettingsScreenProps) => {
```

Remove `setThemeType` and `isDark` from the `useTheme()` destructure — keep only `theme`:

```typescript
  const { theme } = useTheme();
```

Remove the `toggleTheme` function entirely:

```typescript
  // DELETE this:
  // const toggleTheme = (value: boolean) => {
  //   setThemeType(value ? 'dark' : 'light');
  // };
```

- [ ] **Step 2: Replace the dark mode Switch row with a Theme Pressable row**

Find the Appearance section (around line 91–100). Remove the entire dark-mode `<View style={styles.settingsRow}>` block that contains the `Switch`. Replace it with:

```typescript
  <Pressable
    style={[styles.settingsRow, styles.settingsRowLast]}
    onPress={onTheme}
    accessibilityRole="button"
  >
    <Text style={styles.settingsLabel}>{t('settings.theme')}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Text style={styles.settingsValue}>{t(`theme.${themeId}` as any)}</Text>
      <Ionicons
        name={isRTL ? 'chevron-back' : 'chevron-forward'}
        size={20}
        color={theme.colors.textSecondary}
      />
    </View>
  </Pressable>
```

Destructure `themeId` from `useTheme()`:

```typescript
  const { theme, themeId } = useTheme();
```

Also remove the `isDark` import from `useTheme` if it's still there — it's now unused. The `isDark` reference in `<StatusBar style={isDark ? 'light' : 'dark'} />` should use the `useTheme` hook — add it back if needed:

```typescript
  const { theme, themeId, isDark } = useTheme();
```

And update `<StatusBar>` — it's already using `isDark` from the hook so this stays as-is.

After the change, the Appearance section should have two rows only: **Theme** and **Language** (List View stays in the same section too). Make sure the last row in the section has `styles.settingsRowLast`.

Check that `styles.settingsRowLast` is on the Language row (the last row in the section). The Theme row should NOT have `settingsRowLast` since Language comes after it. The final Appearance section layout:

```
┌─────────────────────────────────────────┐
│ APPEARANCE                              │
│─────────────────────────────────────────│
│ Theme                    Natural  ›     │  ← styles.settingsRow (no settingsRowLast)
│─────────────────────────────────────────│
│ List View    [Compact] [Normal] [Wide]  │  ← styles.settingsRow (no settingsRowLast)
│─────────────────────────────────────────│
│ Language                      English  │  ← styles.settingsRow + settingsRowLast
└─────────────────────────────────────────┘
```

- [ ] **Step 3: Run all tests**

```bash
npm test -- --no-coverage
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/screens/SettingsScreen.tsx
git commit -m "feat(theme): replace dark mode toggle with Theme row in Settings"
```

---

## Task 8: Verify in the app

- [ ] **Step 1: Start the web dev server**

```bash
npm run web
```

- [ ] **Step 2: Verify the golden path**

1. Open the app in browser (`http://localhost:8081`)
2. Go to Settings — confirm the dark mode Switch is gone, "Theme" row appears showing "Natural"
3. Tap "Theme" — ThemeScreen opens with two sections, 8 palette cards, "Natural" is highlighted
4. Tap "Ocean" — app immediately re-renders in blue tones; the Ocean card shows a checkmark
5. Navigate back to Settings — "Theme" row shows "Ocean"
6. Reload the page — "Ocean" persists (loaded from AsyncStorage)
7. Tap "Theme" again, select a dark palette (e.g. "Midnight") — app goes dark, checkmark on Midnight
8. Switch language to Hebrew in Settings → verify ThemeScreen section headers are in Hebrew, palette names are in Hebrew, layout is RTL (right-to-left, back arrow points right)

- [ ] **Step 3: Fix any visual issues found, then commit**

```bash
git add -p
git commit -m "fix(theme): visual adjustments after manual testing"
```

(Only if changes were needed — skip if everything looks correct.)
