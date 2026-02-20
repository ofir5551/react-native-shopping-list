import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppRoute, ShoppingItem, ShoppingList } from './types';
import { sanitizeRecents } from './utils/recents';

const ROUTE_KEY = '@shopping_route';

export interface StorageProvider {
  loadLists(): Promise<ShoppingList[]>;
  saveLists(lists: ShoppingList[]): Promise<void>;
  subscribe?(onChange: (lists: ShoppingList[]) => void): () => void;
  joinList?(listId: string): Promise<void>;
  leaveList?(listId: string): Promise<void>;
  deleteList?(listId: string): Promise<void>;
}

const LISTS_KEY = '@shopping_lists';

const isShoppingItem = (value: unknown): value is ShoppingItem => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ShoppingItem>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.purchased === 'boolean' &&
    typeof candidate.createdAt === 'number' &&
    typeof candidate.quantity === 'number'
  );
};

const isShoppingList = (value: unknown): value is ShoppingList => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ShoppingList>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.createdAt === 'number' &&
    typeof candidate.updatedAt === 'number' &&
    (candidate.ownerId === undefined || typeof candidate.ownerId === 'string') &&
    Array.isArray(candidate.items) &&
    candidate.items.every(isShoppingItem) &&
    Array.isArray(candidate.recents) &&
    candidate.recents.every((item) => typeof item === 'string')
  );
};

const normalizeList = (list: ShoppingList): ShoppingList => ({
  ...list,
  recents: sanitizeRecents(list.recents),
});

export const LocalStorageProvider: StorageProvider = {
  async loadLists(): Promise<ShoppingList[]> {
    try {
      const raw = await AsyncStorage.getItem(LISTS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isShoppingList).map(normalizeList);
    } catch {
      return [];
    }
  },

  async saveLists(lists: ShoppingList[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        LISTS_KEY,
        JSON.stringify(lists.map(normalizeList))
      );
    } catch {
      // Ignore write errors for prototype reliability
    }
  },
};

const parseRoute = (raw: string | null): AppRoute | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.name === 'lists') return { name: 'lists' };
    if (parsed?.name === 'list' && typeof parsed.listId === 'string') {
      return { name: 'list', listId: parsed.listId };
    }
    return null;
  } catch {
    return null;
  }
};

export async function loadRoute(): Promise<AppRoute | null> {
  try {
    const raw = await AsyncStorage.getItem(ROUTE_KEY);
    return parseRoute(raw);
  } catch {
    return null;
  }
}

export async function saveRoute(route: AppRoute): Promise<void> {
  try {
    await AsyncStorage.setItem(ROUTE_KEY, JSON.stringify(route));
  } catch {
    // Ignore write errors for prototype reliability
  }
}
