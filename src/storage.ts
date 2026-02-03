import AsyncStorage from '@react-native-async-storage/async-storage';
import { ShoppingItem } from './types';

const STORAGE_KEY = '@shopping_list_items';
const RECENTS_KEY = '@shopping_list_recent';

export async function loadItems(): Promise<ShoppingItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as ShoppingItem[];
  } catch {
    return [];
  }
}

export async function saveItems(items: ShoppingItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore write errors for prototype reliability
  }
}

export async function loadRecents(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => typeof item === 'string');
  } catch {
    return [];
  }
}

export async function saveRecents(items: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(items));
  } catch {
    // Ignore write errors for prototype reliability
  }
}
