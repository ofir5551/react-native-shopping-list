import AsyncStorage from '@react-native-async-storage/async-storage';
import { ShoppingList } from '../types';

const QUEUE_KEY = '@offline_queue';

export type QueuedSave = {
  lists: ShoppingList[];
  timestamp: number;
};

export async function loadQueue(): Promise<QueuedSave | null> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as QueuedSave;
  } catch {
    return null;
  }
}

export async function saveToQueue(lists: ShoppingList[]): Promise<void> {
  try {
    const entry: QueuedSave = { lists, timestamp: Date.now() };
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(entry));
  } catch {
    // best effort
  }
}

export async function clearQueue(): Promise<void> {
  try {
    await AsyncStorage.removeItem(QUEUE_KEY);
  } catch {
    // best effort
  }
}
