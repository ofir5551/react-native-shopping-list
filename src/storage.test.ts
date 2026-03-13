import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isShoppingItem,
  isShoppingList,
  parseRoute,
  LocalStorageProvider,
} from './storage';
import { ShoppingItem, ShoppingList } from './types';

const validItem: ShoppingItem = {
  id: 'item1',
  name: 'Milk',
  purchased: false,
  createdAt: 1000,
  quantity: 1,
};

const validList: ShoppingList = {
  id: 'list1',
  name: 'Groceries',
  createdAt: 1000,
  updatedAt: 2000,
  items: [validItem],
  recents: ['Milk'],
};

// --- isShoppingItem ---
describe('isShoppingItem', () => {
  it('returns true for a valid item', () => {
    expect(isShoppingItem(validItem)).toBe(true);
  });

  it('returns false for null', () => {
    expect(isShoppingItem(null)).toBe(false);
  });

  it('returns false for a string', () => {
    expect(isShoppingItem('item')).toBe(false);
  });

  it('returns false for a number', () => {
    expect(isShoppingItem(42)).toBe(false);
  });

  it('returns false when id is missing', () => {
    const { id: _, ...noId } = validItem;
    expect(isShoppingItem(noId)).toBe(false);
  });

  it('returns false when name is missing', () => {
    const { name: _, ...noName } = validItem;
    expect(isShoppingItem(noName)).toBe(false);
  });

  it('returns false when purchased is missing', () => {
    const { purchased: _, ...noPurchased } = validItem;
    expect(isShoppingItem(noPurchased)).toBe(false);
  });

  it('returns false when createdAt is missing', () => {
    const { createdAt: _, ...noCreatedAt } = validItem;
    expect(isShoppingItem(noCreatedAt)).toBe(false);
  });

  it('returns false when quantity is missing', () => {
    const { quantity: _, ...noQuantity } = validItem;
    expect(isShoppingItem(noQuantity)).toBe(false);
  });

  it('returns true for item with extra fields', () => {
    expect(isShoppingItem({ ...validItem, extra: 'field' })).toBe(true);
  });
});

// --- isShoppingList ---
describe('isShoppingList', () => {
  it('returns true for a valid list', () => {
    expect(isShoppingList(validList)).toBe(true);
  });

  it('returns true when ownerId is undefined (optional)', () => {
    expect(isShoppingList({ ...validList, ownerId: undefined })).toBe(true);
  });

  it('returns true when ownerId is a string', () => {
    expect(isShoppingList({ ...validList, ownerId: 'user1' })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isShoppingList(null)).toBe(false);
  });

  it('returns false when id is missing', () => {
    const { id: _, ...noId } = validList;
    expect(isShoppingList(noId)).toBe(false);
  });

  it('returns false when name is missing', () => {
    const { name: _, ...noName } = validList;
    expect(isShoppingList(noName)).toBe(false);
  });

  it('returns false when createdAt is missing', () => {
    const { createdAt: _, ...noCreatedAt } = validList;
    expect(isShoppingList(noCreatedAt)).toBe(false);
  });

  it('returns false when updatedAt is missing', () => {
    const { updatedAt: _, ...noUpdatedAt } = validList;
    expect(isShoppingList(noUpdatedAt)).toBe(false);
  });

  it('returns false when items is not an array', () => {
    expect(isShoppingList({ ...validList, items: 'bad' })).toBe(false);
  });

  it('returns false when items contains a non-ShoppingItem element', () => {
    expect(isShoppingList({ ...validList, items: [{ bad: true }] })).toBe(false);
  });

  it('returns false when recents is not an array', () => {
    expect(isShoppingList({ ...validList, recents: 'bad' })).toBe(false);
  });

  it('returns false when recents contains a non-string element', () => {
    expect(isShoppingList({ ...validList, recents: [42] })).toBe(false);
  });
});

// --- parseRoute ---
describe('parseRoute', () => {
  it('returns null for null input', () => {
    expect(parseRoute(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseRoute('')).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    expect(parseRoute('not-json{')).toBeNull();
  });

  it('returns lists route for { name: "lists" }', () => {
    expect(parseRoute(JSON.stringify({ name: 'lists' }))).toEqual({ name: 'lists' });
  });

  it('returns list route when name and listId are present', () => {
    expect(parseRoute(JSON.stringify({ name: 'list', listId: 'abc' }))).toEqual({
      name: 'list',
      listId: 'abc',
    });
  });

  it('returns null for list route missing listId', () => {
    expect(parseRoute(JSON.stringify({ name: 'list' }))).toBeNull();
  });

  it('returns null for settings route (not persisted)', () => {
    expect(parseRoute(JSON.stringify({ name: 'settings' }))).toBeNull();
  });

  it('returns null for unknown route name', () => {
    expect(parseRoute(JSON.stringify({ name: 'unknown' }))).toBeNull();
  });
});

// --- LocalStorageProvider.loadLists ---
describe('LocalStorageProvider.loadLists', () => {
  it('returns [] when storage is empty', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    expect(await LocalStorageProvider.loadLists()).toEqual([]);
  });

  it('returns [] when storage contains corrupt JSON', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('not-json{');
    expect(await LocalStorageProvider.loadLists()).toEqual([]);
  });

  it('returns [] when storage contains a non-array', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify({ bad: true }));
    expect(await LocalStorageProvider.loadLists()).toEqual([]);
  });

  it('filters out invalid lists', async () => {
    const data = [validList, { bad: true }, null];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(data));
    const result = await LocalStorageProvider.loadLists();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('list1');
  });

  it('returns valid lists and normalizes recents', async () => {
    const listWithDupeRecents = { ...validList, recents: ['Milk', 'Bread', 'Milk'] };
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify([listWithDupeRecents]));
    const result = await LocalStorageProvider.loadLists();
    expect(result[0].recents).toEqual(['Milk', 'Bread']);
  });
});

// --- LocalStorageProvider.saveLists ---
describe('LocalStorageProvider.saveLists', () => {
  it('writes normalized lists to AsyncStorage', async () => {
    const listWithDupeRecents = { ...validList, recents: ['Milk', 'Bread', 'Milk'] };
    await LocalStorageProvider.saveLists([listWithDupeRecents]);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@shopping_lists',
      expect.stringContaining('"recents":["Milk","Bread"]'),
    );
  });
});
