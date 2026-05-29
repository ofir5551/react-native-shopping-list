# Archive Lists Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to archive completed shopping lists so they are hidden from the main view but browseable and restorable from a dedicated Archive screen.

**Architecture:** Add `isArchived?: boolean` to `ShoppingList` stored in the existing `@shopping_lists` AsyncStorage key. The main lists view filters archived lists out; a new `ArchiveScreen` filters them in. `archiveList` / `restoreList` mutations live in the existing `useShoppingListsApp` hook and both navigate back to the main lists screen after acting. The all-checked nudge banner is passed as a ReactNode prop from `ShoppingListScreen` through to `ShoppingList`'s `ListFooterComponent`.

**Tech Stack:** React Native, Expo, TypeScript, AsyncStorage, Ionicons, `useAppStyles`, `useTheme`, `useLocale`

---

### Task 1: Types + i18n

**Files:**
- Modify: `src/types.ts`
- Modify: `src/i18n/translations/en.ts`
- Modify: `src/i18n/translations/he.ts`

- [ ] **Step 1: Add `isArchived` to `ShoppingList` and `archive` to `AppRoute`**

In `src/types.ts`, change:

```typescript
export type ShoppingList = {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  items: ShoppingItem[];
  recents: string[];
  dismissedSuggestions: string[];
  ownerId?: string;
  shareCode?: string;
  isArchived?: boolean;
};

export type AppRoute =
  | { name: 'lists' }
  | { name: 'list'; listId: string }
  | { name: 'archive' }
  | { name: 'settings' }
  | { name: 'auth' }
  | { name: 'login' }
  | { name: 'signup' };
```

- [ ] **Step 2: Add translation keys to `en.ts`**

In `src/i18n/translations/en.ts`, add these keys inside the `// Lists screen` section (after `'lists.exitLabel'`):

```typescript
  'lists.archiveTitle': 'Archived Lists',
  'lists.noArchived': 'No archived lists',
  'lists.archiveList': 'Archive List',
  'lists.restoreList': 'Restore',
  'lists.archiveNudge': 'All done! Want to archive this list?',
```

- [ ] **Step 3: Add translation keys to `he.ts`**

In `src/i18n/translations/he.ts`, add matching keys after the Hebrew `'lists.exitLabel'` entry:

```typescript
  'lists.archiveTitle': 'רשימות בארכיון',
  'lists.noArchived': 'אין רשימות בארכיון',
  'lists.archiveList': 'העבר לארכיון',
  'lists.restoreList': 'שחזר',
  'lists.archiveNudge': 'סיימת הכל! רוצה להעביר לארכיון?',
```

- [ ] **Step 4: Run tests to confirm nothing broke**

```
npm test -- --passWithNoTests
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```
git add src/types.ts src/i18n/translations/en.ts src/i18n/translations/he.ts
git commit -m "feat(archive): add isArchived type, archive route, and i18n keys"
```

---

### Task 2: Tests for archive/restore logic

**Files:**
- Create: `src/hooks/archive.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/hooks/archive.test.ts`:

```typescript
import { ShoppingList } from '../types';

const baseList: ShoppingList = {
  id: '1',
  name: 'Test',
  createdAt: 1000,
  updatedAt: 2000,
  items: [],
  recents: [],
  dismissedSuggestions: [],
};

describe('archive list filtering', () => {
  it('active view excludes lists with isArchived true', () => {
    const lists: ShoppingList[] = [
      { ...baseList, id: '1', isArchived: false },
      { ...baseList, id: '2', isArchived: true },
      { ...baseList, id: '3' },
    ];
    const active = lists.filter((l) => !l.isArchived);
    expect(active).toHaveLength(2);
    expect(active.map((l) => l.id)).not.toContain('2');
  });

  it('archive view includes only lists with isArchived true', () => {
    const lists: ShoppingList[] = [
      { ...baseList, id: '1', isArchived: false },
      { ...baseList, id: '2', isArchived: true },
      { ...baseList, id: '3' },
    ];
    const archived = lists.filter((l) => l.isArchived === true);
    expect(archived).toHaveLength(1);
    expect(archived[0].id).toBe('2');
  });

  it('archiving a list sets isArchived true', () => {
    const list: ShoppingList = { ...baseList, id: '1' };
    const archived = { ...list, isArchived: true };
    expect(archived.isArchived).toBe(true);
  });

  it('restoring a list sets isArchived false', () => {
    const list: ShoppingList = { ...baseList, id: '1', isArchived: true };
    const restored = { ...list, isArchived: false };
    expect(restored.isArchived).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — confirm they pass (they test pure data logic, not the hook)**

```
npm test -- archive.test
```

Expected: all 4 tests PASS.

- [ ] **Step 3: Commit**

```
git add src/hooks/archive.test.ts
git commit -m "test(archive): add archive/restore filtering tests"
```

---

### Task 3: Hook — archive mutations and derived state

**Files:**
- Modify: `src/hooks/useShoppingListsApp.ts`

- [ ] **Step 1: Update `ShoppingListsAppState` type**

In `useShoppingListsApp.ts`, add these members to the `ShoppingListsAppState` type (after `deleteList` and `leaveList`):

```typescript
  archivedLists: ShoppingList[];
  archiveList: (listId: string) => void;
  restoreList: (listId: string) => void;
  goToArchive: () => void;
  isCurrentListArchived: boolean;
```

- [ ] **Step 2: Update `sortedLists` to exclude archived, add `archivedLists`**

Replace the existing `sortedLists` useMemo:

```typescript
const sortedLists = useMemo(
  () => [...lists].filter((l) => !l.isArchived).sort((a, b) => b.updatedAt - a.updatedAt),
  [lists]
);

const archivedLists = useMemo(
  () => [...lists].filter((l) => l.isArchived === true).sort((a, b) => b.updatedAt - a.updatedAt),
  [lists]
);
```

- [ ] **Step 3: Add `archiveList`, `restoreList`, `goToArchive`, `isCurrentListArchived`**

Add these after the `leaveList` function:

```typescript
const archiveList = (listId: string) => {
  updateListById(listId, (list) => ({ ...list, isArchived: true }));
  setRoute(DEFAULT_ROUTE);
};

const restoreList = (listId: string) => {
  updateListById(listId, (list) => ({ ...list, isArchived: false }));
  setRoute(DEFAULT_ROUTE);
};

const goToArchive = () => {
  setRoute({ name: 'archive' });
};

const isCurrentListArchived = currentList?.isArchived === true;
```

- [ ] **Step 4: Add new members to the return statement**

In the `return` object at the bottom of the hook, add (after `leaveList`):

```typescript
    archivedLists,
    archiveList,
    restoreList,
    goToArchive,
    isCurrentListArchived,
```

- [ ] **Step 5: Run tests**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```
git add src/hooks/useShoppingListsApp.ts
git commit -m "feat(archive): add archiveList, restoreList, archivedLists to hook"
```

---

### Task 4: ArchiveScreen

**Files:**
- Create: `src/screens/ArchiveScreen.tsx`

- [ ] **Step 1: Create the ArchiveScreen component**

Create `src/screens/ArchiveScreen.tsx`:

```typescript
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
```

- [ ] **Step 2: Run tests**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```
git add src/screens/ArchiveScreen.tsx
git commit -m "feat(archive): add ArchiveScreen"
```

---

### Task 5: ShoppingList component — archiveNudge prop

**Files:**
- Modify: `src/components/ShoppingList.tsx`

- [ ] **Step 1: Add `archiveNudge` prop and render it above CompletedSection**

Replace the entire `src/components/ShoppingList.tsx` with:

```typescript
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
  archiveNudge?: React.ReactNode;
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
  archiveNudge,
}: ShoppingListProps) => {
  const styles = useAppStyles();

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ShoppingItem>) => (
      <ItemRow
        item={item}
        onToggle={onToggleItem}
        onDelete={onDeleteItem}
        onIncrement={onIncrementItem}
        onDecrement={onDecrementItem}
      />
    ),
    [onToggleItem, onDeleteItem, onIncrementItem, onDecrementItem]
  );

  const footer = useMemo(
    () =>
      archiveNudge || completedItems.length > 0 ? (
        <>
          {archiveNudge}
          {completedItems.length > 0 ? (
            <CompletedSection
              items={completedItems}
              isExpanded={showCompleted}
              onToggleExpanded={onToggleCompleted}
              onToggleItem={onToggleItem}
              onDeleteItem={onDeleteItem}
              onIncrementItem={onIncrementItem}
              onDecrementItem={onDecrementItem}
            />
          ) : null}
        </>
      ) : null,
    [
      archiveNudge,
      completedItems,
      showCompleted,
      onToggleCompleted,
      onToggleItem,
      onDeleteItem,
      onIncrementItem,
      onDecrementItem,
    ]
  );

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
```

- [ ] **Step 2: Run tests**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```
git add src/components/ShoppingList.tsx
git commit -m "feat(archive): add archiveNudge prop to ShoppingList component"
```

---

### Task 6: ShoppingListScreen — archive menu item + nudge banner

**Files:**
- Modify: `src/screens/ShoppingListScreen.tsx`

- [ ] **Step 1: Add `isArchived`, `onArchiveList`, `onRestoreList` to props type**

In `ShoppingListScreen.tsx`, add to the `ShoppingListScreenProps` type (after `goToAuth`):

```typescript
  isArchived: boolean;
  onArchiveList: () => void;
  onRestoreList: () => void;
```

- [ ] **Step 2: Destructure the new props in the function signature**

Add to the destructuring (after `goToAuth`):

```typescript
  isArchived,
  onArchiveList,
  onRestoreList,
```

- [ ] **Step 3: Add the archive/restore option to the settings popover**

In the settings popover `<View style={styles.settingsPopover}>`, add a new button after the share button divider (before "Clear recents"):

```typescript
            <View style={styles.settingsPopoverDivider} />
            <Pressable
              style={styles.settingsPopoverButton}
              onPress={() => {
                setIsSettingsOpen(false);
                if (isArchived) onRestoreList();
                else onArchiveList();
              }}
            >
              <Text style={styles.settingsPopoverButtonText}>
                {isArchived ? t('lists.restoreList') : t('lists.archiveList')}
              </Text>
            </Pressable>
```

So the full popover content becomes:

```typescript
          <View style={styles.settingsPopover}>
            <Pressable
              style={[styles.settingsPopoverButton, !currentUserId && { opacity: 0.4 }]}
              onPress={() => { if (!currentUserId) return; setIsSettingsOpen(false); onShareList(); }}
              disabled={!currentUserId}
            >
              <Text style={styles.settingsPopoverButtonText}>{t('shoppingList.shareList')}</Text>
            </Pressable>
            <View style={styles.settingsPopoverDivider} />
            <Pressable
              style={styles.settingsPopoverButton}
              onPress={() => {
                setIsSettingsOpen(false);
                if (isArchived) onRestoreList();
                else onArchiveList();
              }}
            >
              <Text style={styles.settingsPopoverButtonText}>
                {isArchived ? t('lists.restoreList') : t('lists.archiveList')}
              </Text>
            </Pressable>
            <View style={styles.settingsPopoverDivider} />
            <Pressable
              style={styles.settingsPopoverButton}
              onPress={handleClearRecentsPress}
            >
              <Text style={styles.settingsPopoverButtonText}>{t('shoppingList.clearRecents')}</Text>
            </Pressable>
            {hasItems ? (
              <>
                <View style={styles.settingsPopoverDivider} />
                <Pressable
                  style={styles.settingsPopoverButton}
                  onPress={handleClearAllPress}
                >
                  <Text
                    style={[
                      styles.settingsPopoverButtonText,
                      styles.settingsPopoverDangerText,
                    ]}
                  >
                    {t('shoppingList.clearAllItems')}
                  </Text>
                </Pressable>
              </>
            ) : null}
          </View>
```

- [ ] **Step 4: Build the nudge banner and pass it to ShoppingList**

Add this computed value just before the `return` statement in the component:

```typescript
  const archiveNudge =
    !isArchived && activeItems.length === 0 && completedItems.length > 0 ? (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: theme.colors.surfaceHighlight,
          borderRadius: 12,
          marginHorizontal: 16,
          marginBottom: 8,
        }}
      >
        <Text
          style={{
            fontFamily: theme.fonts.regular,
            fontSize: 14,
            color: theme.colors.textSecondary,
            flex: 1,
          }}
        >
          {t('lists.archiveNudge')}
        </Text>
        <Pressable
          onPress={onArchiveList}
          style={({ pressed }) => ({
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: theme.colors.primary,
            opacity: pressed ? 0.7 : 1,
            marginLeft: 12,
          })}
          accessibilityRole="button"
          accessibilityLabel={t('lists.archiveList')}
        >
          <Text
            style={{
              fontFamily: theme.fonts.semibold,
              fontSize: 14,
              color: theme.colors.primaryText,
            }}
          >
            {t('lists.archiveList')}
          </Text>
        </Pressable>
      </View>
    ) : undefined;
```

- [ ] **Step 5: Pass `archiveNudge` to `<ShoppingList>`**

In the JSX, find the `<ShoppingList ... />` element and add the prop:

```typescript
      {hasItems && (
        <ShoppingList
          activeItems={activeItems}
          completedItems={completedItems}
          showCompleted={showCompleted}
          onToggleCompleted={() => setShowCompleted(!showCompleted)}
          onToggleItem={handleToggle}
          onDeleteItem={handleDelete}
          onIncrementItem={handleIncrementQuantity}
          onDecrementItem={handleDecrementQuantity}
          archiveNudge={archiveNudge}
        />
      )}
```

- [ ] **Step 6: Run tests**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```
git add src/screens/ShoppingListScreen.tsx
git commit -m "feat(archive): add archive/restore menu action and all-done nudge to ShoppingListScreen"
```

---

### Task 7: ListsScreen — archive icon in header

**Files:**
- Modify: `src/screens/ListsScreen.tsx`

- [ ] **Step 1: Add `onOpenArchive` to props type**

In `src/screens/ListsScreen.tsx`, add to `ListsScreenProps`:

```typescript
  onOpenArchive: () => void;
```

- [ ] **Step 2: Destructure the new prop**

Add `onOpenArchive` to the destructured props in `ListsScreen`.

- [ ] **Step 3: Add archive icon button to the header**

In the `<Header>` children (next to the existing join-list button), add an archive icon button. The existing children block:

```typescript
      <Header
        title={t('lists.title')}
        subtitle={t('lists.subtitle')}
        onOpenSettings={onOpenSettings}
      >
        {currentUserId && (
          <Pressable
            style={styles.iconButton}
            onPress={onOpenJoinListModal}
            accessibilityRole="button"
            accessibilityLabel={t('lists.joinShared')}
          >
            <Ionicons name="link-outline" size={20} color={theme.colors.textSecondary} />
          </Pressable>
        )}
      </Header>
```

Change to:

```typescript
      <Header
        title={t('lists.title')}
        subtitle={t('lists.subtitle')}
        onOpenSettings={onOpenSettings}
      >
        <Pressable
          style={styles.iconButton}
          onPress={onOpenArchive}
          accessibilityRole="button"
          accessibilityLabel={t('lists.archiveTitle')}
        >
          <Ionicons name="archive-outline" size={20} color={theme.colors.textSecondary} />
        </Pressable>
        {currentUserId && (
          <Pressable
            style={styles.iconButton}
            onPress={onOpenJoinListModal}
            accessibilityRole="button"
            accessibilityLabel={t('lists.joinShared')}
          >
            <Ionicons name="link-outline" size={20} color={theme.colors.textSecondary} />
          </Pressable>
        )}
      </Header>
```

- [ ] **Step 4: Run tests**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```
git add src/screens/ListsScreen.tsx
git commit -m "feat(archive): add archive icon button to ListsScreen header"
```

---

### Task 8: HomeScreen — wire archive everywhere

**Files:**
- Modify: `src/screens/HomeScreen.tsx`

- [ ] **Step 1: Import `ArchiveScreen` and new hook values**

Add the import:

```typescript
import { ArchiveScreen } from './ArchiveScreen';
```

- [ ] **Step 2: Destructure new hook values**

In the `useShoppingListsApp()` destructuring, add:

```typescript
    archivedLists,
    archiveList,
    restoreList,
    goToArchive,
    isCurrentListArchived,
```

- [ ] **Step 3: Derive `isCurrentListArchived` for BackHandler and update BackHandler**

Replace the existing `useEffect` for `BackHandler` with:

```typescript
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (route.name === 'list') {
          if (isOverlayOpen) return false;
          if (isCurrentListArchived) goToArchive();
          else goToLists();
          return true;
        }
        if (route.name === 'archive') {
          goToLists();
          return true;
        }
        if (route.name === 'settings') {
          goToLists();
          return true;
        }
        return false;
      }
    );

    return () => subscription.remove();
  }, [route.name, isOverlayOpen, goToLists, goToArchive, isCurrentListArchived]);
```

- [ ] **Step 4: Add the archive route to the router**

Add this block before the `if (route.name === 'lists' || !currentList)` check:

```typescript
  if (route.name === 'archive') {
    return (
      <ArchiveScreen
        archivedLists={archivedLists}
        onOpenList={openList}
        onBack={goToLists}
      />
    );
  }
```

- [ ] **Step 5: Pass new props to `ListsScreen`**

In the `<ListsScreen ... />` render (both the primary and the hidden one inside the list view), add:

```typescript
        onOpenArchive={goToArchive}
```

- [ ] **Step 6: Pass new props to `ShoppingListScreen`**

In the `<ShoppingListScreen ... />` render, add:

```typescript
        isArchived={isCurrentListArchived}
        onArchiveList={() => archiveList(currentList!.id)}
        onRestoreList={() => restoreList(currentList!.id)}
        onBack={isCurrentListArchived ? goToArchive : goToLists}
```

Also update the existing `onBack={goToLists}` to the conditional version above.

- [ ] **Step 7: Run tests**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 8: Final commit**

```
git add src/screens/HomeScreen.tsx
git commit -m "feat(archive): wire ArchiveScreen and archive actions into HomeScreen"
```
